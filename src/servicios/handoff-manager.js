/**
 * 🤝 HANDOFF MANAGER - Gestor de UX de Transiciones
 * 
 * Ejecuta la experiencia de usuario de handoffs entre agentes.
 * 
 * CARACTERÍSTICAS v735 (Mercedes Benz):
 * - Validación de transiciones
 * - Handoff silencioso (solo nuevo agente habla)
 * - Guarda forms del agente anterior
 * - Delay de 7s para transición suave
 * - Mensaje de bienvenida personalizado
 * - Logs detallados de cada handoff
 * 
 * CAMBIO ARQUITECTURAL:
 * - HandoffManager maneja UX de transición (forms, delay, mensajes)
 * - El commit final de activeAgent se hace DESPUÉS en wassenger.js
 * 
 * @author Aurora Core - Coworkia
 * @date 11 Feb 2026 (v735 refactor)
 */

import { validateTransition, logTransition } from '../deteccion-intenciones/agent-transitions.js';
import { getAgentForm, saveAgentForm, clearAgentForm } from './agent-form-manager.js';
import { loggers } from '../utils/logger.js';

/**
 * Ejecuta handoff completo entre agentes
 * 
 * FLUJO v735 (Mercedes Benz):
 * 1. Validar transición
 * 2. Guardar form del agente actual (si existe)
 * 3. Delay para transición suave (7s)
 * 4. Enviar mensaje de bienvenida del nuevo agente
 * 5. Guardar en conversación
 * 
 * NOTA: Esta función NO persiste activeAgent.
 *       Solo ejecuta la transición visible para el usuario.
 *       El commit de estado se realiza después de un handoff exitoso.
 * 
 * @param {string} userId - ID del usuario
 * @param {Object} profile - Perfil del usuario
 * @param {string} fromAgent - Agente actual
 * @param {string} toAgent - Agente destino
 * @param {string} userName - Nombre del usuario
 * @param {string} userLanguage - Idioma del usuario
 * @param {Function} saveProfile - Función para guardar perfil (NO USADA en v735)
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
  saveProfile, // Mantenido por compatibilidad pero NO usado
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
    
    console.log(`[HANDOFF-MANAGER] 🤝 Iniciando handoff UX: ${fromAgent} → ${toAgent}`);
    console.log(`[HANDOFF-MANAGER] ℹ️  AgentStateManager ya actualizó BD - solo manejamos UX`);
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
    
    // 3️⃣ Delay para transición suave (7 segundos)
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

export default { executeHandoff };
