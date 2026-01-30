/**
 * 🤝 HANDOFF MANAGER - Gestor Centralizado de Transiciones
 * 
 * Ejecuta handoffs entre agentes de forma segura y trazable.
 * 
 * CARACTERÍSTICAS:
 * - Validación de transiciones
 * - Handoff silencioso (solo nuevo agente habla)
 * - Guarda forms del agente anterior
 * - Actualización de activeAgent con lock
 * - Memoria conversacional por agente
 * - Logs detallados de cada handoff
 * 
 * @author Aurora Core - Coworkia
 * @date 30 Ene 2026
 */

import { validateTransition, logTransition } from '../deteccion-intenciones/agent-transitions.js';
import { getAgentForm, saveAgentForm, clearAgentForm } from './agent-form-manager.js';
import { loggers } from '../utils/logger.js';

/**
 * Locks para prevenir race conditions en saveProfile
 * Map<userId, Promise>
 */
const userLocks = new Map();

/**
 * Adquiere lock para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Function>} - Función release() para liberar lock
 */
async function acquireLock(userId) {
  // Si ya hay un lock, esperar a que termine
  while (userLocks.has(userId)) {
    await userLocks.get(userId);
  }
  
  // Crear nuevo lock
  let releaseFn;
  const lockPromise = new Promise(resolve => {
    releaseFn = resolve;
  });
  
  userLocks.set(userId, lockPromise);
  
  // Retornar función para liberar
  return () => {
    userLocks.delete(userId);
    releaseFn();
  };
}

/**
 * Ejecuta handoff completo entre agentes
 * 
 * FLUJO:
 * 1. Validar transición
 * 2. Guardar form del agente actual (si existe)
 * 3. Adquirir lock para activeAgent
 * 4. Actualizar activeAgent en BD
 * 5. Liberar lock
 * 6. Enviar mensaje de entrada del nuevo agente (silencioso)
 * 7. Guardar en conversación
 * 
 * @param {string} userId - ID del usuario
 * @param {Object} profile - Perfil del usuario
 * @param {string} fromAgent - Agente actual
 * @param {string} toAgent - Agente destino
 * @param {string} userName - Nombre del usuario
 * @param {string} userLanguage - Idioma del usuario
 * @param {Function} saveProfile - Función para guardar perfil
 * @param {Function} sendMessage - Función para enviar mensaje
 * @param {Function} saveConversation - Función para guardar conversación
 * @returns {Promise<Object>} - { success, fromAgent, toAgent, message }
 */
export async function executeHandoff(
  userId,
  profile,
  fromAgent,
  toAgent,
  userName = 'amigo',
  userLanguage = 'es',
  saveProfile,
  sendMessage,
  saveConversation
) {
  const startTime = Date.now();
  
  try {
    // 1️⃣ Validar transición
    if (!validateTransition(fromAgent, toAgent)) {
      loggers.webhook.error('Handoff validation failed', {
        userId,
        from: fromAgent,
        to: toAgent
      });
      
      logTransition(fromAgent, toAgent, false, 'validation_failed');
      
      return {
        success: false,
        error: 'invalid_transition',
        fromAgent,
        toAgent
      };
    }
    
    console.log(`[HANDOFF-MANAGER] 🤝 Iniciando handoff: ${fromAgent} → ${toAgent}`);
    logTransition(fromAgent, toAgent, true, 'starting');
    
    // 2️⃣ Guardar form del agente actual (si existe)
    let savedForm = null;
    try {
      const currentForm = await getAgentForm(userId, fromAgent).catch(() => null);
      
      if (currentForm && currentForm.formData) {
        console.log(`[HANDOFF-MANAGER] 💾 Guardando form de ${fromAgent}`);
        await saveAgentForm(userId, fromAgent, currentForm.formData, 120);
        savedForm = currentForm;
      }
    } catch (formError) {
      console.warn(`[HANDOFF-MANAGER] ⚠️ Error guardando form de ${fromAgent}:`, formError);
      // No fallar handoff por error en form
    }
    
    // 3️⃣ Adquirir lock para actualización de activeAgent
    const release = await acquireLock(userId);
    
    try {
      // 4️⃣ Actualizar activeAgent en BD (con lock)
      console.log(`[HANDOFF-MANAGER] 🔄 Actualizando activeAgent: ${fromAgent} → ${toAgent}`);
      
      profile.activeAgent = toAgent;
      profile.conversationCount = (profile.conversationCount || 0) + 1;
      
      // Agregar a historial de agentes
      if (!profile.agentHistory) {
        profile.agentHistory = {};
      }
      
      if (!profile.agentHistory[toAgent]) {
        profile.agentHistory[toAgent] = {
          firstContact: new Date().toISOString(),
          contactCount: 1,
          lastMessages: []
        };
      } else {
        profile.agentHistory[toAgent].contactCount++;
      }
      
      profile.agentHistory[toAgent].lastContact = new Date().toISOString();
      
      await saveProfile(userId, profile);
      
      console.log(`[HANDOFF-MANAGER] ✅ activeAgent actualizado en BD: ${toAgent}`);
      
    } finally {
      // 5️⃣ Liberar lock SIEMPRE
      release();
    }
    
    // 6️⃣ Delay para transición suave (7 segundos)
    console.log(`[HANDOFF-MANAGER] ⏱️ Esperando 7s para transición suave...`);
    await new Promise(resolve => setTimeout(resolve, 7000));
    
    // 7️⃣ Generar mensaje de entrada del nuevo agente (V2: Centralized)
    const { getHandoffMessages } = await import('../deteccion-intenciones/handoff-messages.js');
    
    // Verificar si usuario ya habló con este agente antes (isReturning)
    const agentHistory = profile.agent_history || {};
    const hasSpokenBefore = agentHistory[toAgent] && agentHistory[toAgent].length > 0;
    
    const handoffMessages = getHandoffMessages(fromAgent, toAgent, userName, userLanguage, hasSpokenBefore);
    
    if (!handoffMessages || !handoffMessages.entrada) {
      throw new Error(`No se encontró mensaje de entrada para ${toAgent}`);
    }
    
    // 8️⃣ Enviar mensaje (solo nuevo agente, SILENCIOSO)
    console.log(`[HANDOFF-MANAGER] 👋 ${toAgent} toma el relevo`);
    await sendMessage(userId, handoffMessages.entrada);
    
    // 9️⃣ Guardar en conversación
    await saveConversation(userId, {
      role: 'assistant',
      content: handoffMessages.entrada,
      agent: toAgent
    });
    
    // 🔟 Logs finales
    const duration = Date.now() - startTime;
    console.log(`[HANDOFF-MANAGER] ✅ Handoff completado en ${duration}ms`);
    
    loggers.webhook.info('Handoff completed', {
      userId,
      fromAgent,
      toAgent,
      duration,
      savedForm: !!savedForm
    });
    
    logTransition(fromAgent, toAgent, true, `completed_${duration}ms`);
    
    return {
      success: true,
      fromAgent,
      toAgent,
      message: handoffMessages.entrada,
      duration,
      savedForm: !!savedForm
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error(`[HANDOFF-MANAGER] ❌ Error en handoff:`, error);
    
    loggers.webhook.error('Handoff failed', {
      userId,
      fromAgent,
      toAgent,
      duration,
      error: error.message
    });
    
    logTransition(fromAgent, toAgent, false, `error_${error.message}`);
    
    return {
      success: false,
      error: error.message,
      fromAgent,
      toAgent,
      duration
    };
  }
}

/**
 * Verifica si un handoff está en progreso para un usuario
 * (Para evitar handoffs concurrentes)
 * 
 * @param {string} userId - ID del usuario
 * @returns {boolean}
 */
export function isHandoffInProgress(userId) {
  return userLocks.has(userId);
}

/**
 * Obtiene estadísticas de handoffs (para monitoreo)
 * @returns {Object} - { activeHandoffs, totalLocks }
 */
export function getHandoffStats() {
  return {
    activeHandoffs: userLocks.size,
    userIds: Array.from(userLocks.keys())
  };
}

export default {
  executeHandoff,
  isHandoffInProgress,
  getHandoffStats
};
