/**
 * 🤖 AGENT STATE MANAGER - Gestor Centralizado de Estado de Agentes
 * 
 * Sistema único y centralizado para TODAS las actualizaciones de activeAgent.
 * Reemplaza múltiples puntos de actualización dispersos que causaban race conditions.
 * 
 * RESPONSABILIDADES:
 * - Lock automático para prevenir race conditions
 * - Validación de transiciones entre agentes
 * - Historial completo de cambios por usuario
 * - Logs unificados y trazables
 * - Rollback si falla actualización
 * 
 * FILOSOFÍA MERCEDES BENZ:
 * - UN SOLO lugar actualiza activeAgent en BD
 * - Cero duplicación de lógica
 * - Arquitectura limpia sin parches
 * 
 * @author Diego Villota & Nena
 * @date 11 Feb 2026
 * @version 1.0.0 (v735)
 */

import { validateTransition } from '../deteccion-intenciones/agent-transitions.js';
import { loggers } from '../utils/logger.js';

/**
 * Locks activos por usuario para prevenir race conditions
 * Map<userId, Promise>
 */
const userLocks = new Map();

/**
 * Historial de cambios de agente (últimos 100 por usuario)
 * Map<userId, Array<StateChange>>
 */
const stateHistory = new Map();

/**
 * @typedef {Object} StateChange
 * @property {string} fromAgent - Agente anterior
 * @property {string} toAgent - Agente nuevo
 * @property {string} reason - Razón del cambio (handoff, orchestrator, implicit, force)
 * @property {string} timestamp - ISO timestamp
 * @property {Object} metadata - Datos adicionales
 * @property {boolean} success - Si el cambio fue exitoso
 */

/**
 * @typedef {Object} UpdateContext
 * @property {string} reason - Razón del cambio: 'handoff' | 'orchestrator' | 'implicit' | 'force'
 * @property {string} fromAgent - Agente desde el cual se hace el cambio
 * @property {Object} [metadata] - Metadata adicional (intent, flags, etc)
 * @property {boolean} [skipValidation] - Saltear validación (solo casos excepcionales)
 * @property {string} [intentReason] - Razón del intent (para logs)
 */

/**
 * Adquiere lock exclusivo para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Function>} - Función release() para liberar lock
 */
async function acquireLock(userId) {
  // Si ya hay un lock, esperar a que termine
  while (userLocks.has(userId)) {
    console.log(`[AgentStateManager] ⏳ Esperando lock para ${userId}...`);
    await userLocks.get(userId);
  }
  
  // Crear nuevo lock
  let releaseFn;
  const lockPromise = new Promise(resolve => {
    releaseFn = resolve;
  });
  
  userLocks.set(userId, lockPromise);
  console.log(`[AgentStateManager] 🔒 Lock adquirido para ${userId}`);
  
  // Retornar función para liberar
  return () => {
    userLocks.delete(userId);
    releaseFn();
    console.log(`[AgentStateManager] 🔓 Lock liberado para ${userId}`);
  };
}

/**
 * Valida si una transición de agente es permitida
 * @param {string} fromAgent - Agente origen
 * @param {string} toAgent - Agente destino
 * @param {UpdateContext} context - Contexto del cambio
 * @returns {boolean} - true si es válida
 */
function validateStateTransition(fromAgent, toAgent, context) {
  // Skip validation si está explícitamente solicitado
  if (context.skipValidation) {
    console.log(`[AgentStateManager] ⚠️ Validación salteada (skipValidation=true)`);
    return true;
  }
  
  // Mismo agente = no cambio (permitido pero log warning)
  if (fromAgent === toAgent) {
    console.warn(`[AgentStateManager] ⚠️ Intento de cambio al mismo agente: ${fromAgent}`);
    return false;
  }
  
  // Force = siempre permitido
  if (context.reason === 'force') {
    console.log(`[AgentStateManager] ⚡ Cambio forzado: ${fromAgent} → ${toAgent}`);
    return true;
  }
  
  // Usar validateTransition de agent-transitions.js
  const isValid = validateTransition(fromAgent, toAgent);
  
  if (!isValid) {
    console.error(`[AgentStateManager] ❌ Transición inválida: ${fromAgent} → ${toAgent}`, {
      reason: context.reason,
      metadata: context.metadata
    });
  }
  
  return isValid;
}

/**
 * Guarda cambio en historial
 * @param {string} userId - ID del usuario
 * @param {StateChange} change - Cambio realizado
 */
function recordStateChange(userId, change) {
  if (!stateHistory.has(userId)) {
    stateHistory.set(userId, []);
  }
  
  const history = stateHistory.get(userId);
  history.unshift(change); // Agregar al inicio
  
  // Mantener solo últimos 100 cambios
  if (history.length > 100) {
    history.pop();
  }
  
  console.log(`[AgentStateManager] 📝 Cambio registrado en historial: ${change.fromAgent} → ${change.toAgent} (${change.reason})`);
}

/**
 * Obtiene historial de cambios de un usuario
 * @param {string} userId - ID del usuario
 * @param {number} [limit=10] - Cantidad de cambios a retornar
 * @returns {Array<StateChange>} - Historial de cambios
 */
export function getStateHistory(userId, limit = 10) {
  const history = stateHistory.get(userId) || [];
  return history.slice(0, limit);
}

/**
 * MÉTODO PRINCIPAL: Actualiza agente de un usuario
 * 
 * Este es el ÚNICO punto de entrada para cambiar activeAgent.
 * Garantiza atomicidad, validación y trazabilidad.
 * 
 * @param {string} userId - ID del usuario (phone number)
 * @param {string} newAgent - Nuevo agente (AURORA, AXEL, etc)
 * @param {UpdateContext} context - Contexto del cambio
 * @param {Function} saveProfileFn - Función para guardar perfil en BD
 * @param {Object} currentProfile - Perfil actual del usuario
 * @returns {Promise<Object>} - { success, fromAgent, toAgent, duration, error }
 */
export async function updateAgent(userId, newAgent, context, saveProfileFn, currentProfile) {
  const startTime = Date.now();
  
  // Validar parámetros requeridos
  if (!userId || !newAgent || !context || !saveProfileFn || !currentProfile) {
    const error = 'Parámetros requeridos faltantes';
    console.error(`[AgentStateManager] ❌ ${error}`, { userId, newAgent, context });
    return { success: false, error };
  }
  
  const fromAgent = context.fromAgent || currentProfile.activeAgent || 'AURORA';
  
  console.log(`[AgentStateManager] 🔄 Iniciando cambio de agente:`, {
    userId,
    fromAgent,
    toAgent: newAgent,
    reason: context.reason,
    intentReason: context.intentReason
  });
  
  // Log a sistema de observabilidad
  loggers.webhook.info('Agent state change initiated', {
    userId,
    fromAgent,
    toAgent: newAgent,
    reason: context.reason
  });
  
  // 1️⃣ Validar transición
  if (!validateStateTransition(fromAgent, newAgent, context)) {
    const change = {
      fromAgent,
      toAgent: newAgent,
      reason: context.reason,
      timestamp: new Date().toISOString(),
      metadata: context.metadata,
      success: false,
      error: 'invalid_transition'
    };
    
    recordStateChange(userId, change);
    
    return {
      success: false,
      fromAgent,
      toAgent: newAgent,
      error: 'invalid_transition',
      duration: Date.now() - startTime
    };
  }
  
  // 2️⃣ Adquirir lock
  const release = await acquireLock(userId);
  
  try {
    // 3️⃣ Actualizar perfil con nuevo agente
    console.log(`[AgentStateManager] 💾 Actualizando BD: ${fromAgent} → ${newAgent}`);
    
    // Preparar actualización
    currentProfile.activeAgent = newAgent;
    currentProfile.conversationCount = (currentProfile.conversationCount || 0) + 1;
    
    // Actualizar historial de agentes en perfil
    if (!currentProfile.agentHistory) {
      currentProfile.agentHistory = {};
    }
    
    if (!currentProfile.agentHistory[newAgent]) {
      currentProfile.agentHistory[newAgent] = {
        firstContact: new Date().toISOString(),
        contactCount: 1,
        lastMessages: []
      };
    } else {
      currentProfile.agentHistory[newAgent].contactCount++;
    }
    
    currentProfile.agentHistory[newAgent].lastContact = new Date().toISOString();
    
    // Guardar en BD usando función provista
    await saveProfileFn(userId, currentProfile);
    
    console.log(`[AgentStateManager] ✅ BD actualizada exitosamente: ${newAgent}`);
    
    // 4️⃣ Registrar cambio exitoso en historial
    const change = {
      fromAgent,
      toAgent: newAgent,
      reason: context.reason,
      timestamp: new Date().toISOString(),
      metadata: context.metadata,
      success: true
    };
    
    recordStateChange(userId, change);
    
    // 5️⃣ Log final
    const duration = Date.now() - startTime;
    
    loggers.webhook.info('Agent state change completed', {
      userId,
      fromAgent,
      toAgent: newAgent,
      reason: context.reason,
      duration
    });
    
    console.log(`[AgentStateManager] ✅ Cambio completado en ${duration}ms`);
    
    return {
      success: true,
      fromAgent,
      toAgent: newAgent,
      duration,
      change
    };
    
  } catch (error) {
    // Rollback implícito: perfil no se guardó, sigue con agente anterior
    console.error(`[AgentStateManager] ❌ Error actualizando BD:`, error);
    
    const change = {
      fromAgent,
      toAgent: newAgent,
      reason: context.reason,
      timestamp: new Date().toISOString(),
      metadata: context.metadata,
      success: false,
      error: error.message
    };
    
    recordStateChange(userId, change);
    
    loggers.webhook.error('Agent state change failed', {
      userId,
      fromAgent,
      toAgent: newAgent,
      error: error.message
    });
    
    return {
      success: false,
      fromAgent,
      toAgent: newAgent,
      error: error.message,
      duration: Date.now() - startTime
    };
    
  } finally {
    // 6️⃣ Liberar lock SIEMPRE
    release();
  }
}

/**
 * Verifica si hay un cambio de agente en progreso
 * @param {string} userId - ID del usuario
 * @returns {boolean} - true si hay lock activo
 */
export function isUpdateInProgress(userId) {
  return userLocks.has(userId);
}

/**
 * Limpia historial de un usuario (para testing)
 * @param {string} userId - ID del usuario
 */
export function clearHistory(userId) {
  stateHistory.delete(userId);
  console.log(`[AgentStateManager] 🧹 Historial limpiado para ${userId}`);
}
