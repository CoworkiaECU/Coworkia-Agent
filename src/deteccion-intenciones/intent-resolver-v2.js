/**
 * 🎯 INTENT RESOLVER V2 - Sistema Unificado de Detección
 * 
 * ÚNICO punto de decisión para handoffs y sugerencias.
 * Reemplaza lógica duplicada de detectar-intencion.js y decidirAgente().
 * 
 * ARQUITECTURA (30 Ene 2026):
 * 1. @mención → Handoff INMEDIATO (silencioso)
 * 2. Keywords → SUGERENCIA (agente actual menciona especialista)
 * 3. Sin match → Mantener agente actual
 * 
 * @author Aurora Core - Coworkia
 */

import { detectExplicitMention, detectSuggestedAgent, isEmailAddress } from './agent-keywords.js';
import { validateTransition, isValidAgent } from './agent-transitions.js';

/**
 * Tipos de intención detectados
 */
export const INTENT_TYPES = {
  HANDOFF: 'HANDOFF',           // @mención explícita → cambio inmediato
  SUGGESTION: 'SUGGESTION',     // Keyword → sugerir especialista
  MAINTAIN: 'MAINTAIN',         // Mantener agente actual
  INVALID: 'INVALID'            // Transición no válida
};

/**
 * Resuelve la intención del usuario y decide acción
 * 
 * @param {string} message - Mensaje del usuario
 * @param {string} currentAgent - Agente actualmente activo
 * @param {Object} context - Contexto adicional (hasActiveForm, etc)
 * @returns {Object} - { type, targetAgent, suggestedAgent, reason, isValid }
 */
export function resolveIntent(message, currentAgent = 'AURORA', context = {}) {
  const text = message.trim();
  
  // Validar agente actual
  if (!isValidAgent(currentAgent)) {
    console.warn(`[INTENT-V2] Agente actual inválido: ${currentAgent}, usando AURORA`);
    currentAgent = 'AURORA';
  }
  
  // Skip si es email
  if (isEmailAddress(text)) {
    return {
      type: INTENT_TYPES.MAINTAIN,
      targetAgent: currentAgent,
      reason: 'email_address_skip',
      isValid: true
    };
  }
  
  // 1️⃣ PRIORIDAD MÁXIMA: @mención explícita → handoff inmediato
  const explicitAgent = detectExplicitMention(text);
  
  if (explicitAgent) {
    // Validar transición
    const isValid = validateTransition(currentAgent, explicitAgent);
    
    if (!isValid) {
      return {
        type: INTENT_TYPES.INVALID,
        targetAgent: null,
        fromAgent: currentAgent,
        requestedAgent: explicitAgent,
        reason: 'invalid_transition',
        isValid: false,
        message: `No puedes ir de ${currentAgent} a ${explicitAgent} directamente.`
      };
    }
    
    return {
      type: INTENT_TYPES.HANDOFF,
      targetAgent: explicitAgent,
      fromAgent: currentAgent,
      reason: 'explicit_mention',
      isValid: true,
      explicitMention: true
    };
  }
  
  // 2️⃣ Keywords → SUGERENCIA (NO handoff automático)
  const suggestedAgent = detectSuggestedAgent(text);
  
  if (suggestedAgent && suggestedAgent !== currentAgent) {
    return {
      type: INTENT_TYPES.SUGGESTION,
      targetAgent: currentAgent,        // Mantener agente actual
      suggestedAgent: suggestedAgent,   // Sugerir este agente
      reason: 'keyword_match',
      isValid: true,
      shouldMentionSpecialist: true
    };
  }
  
  // 3️⃣ Fallback: Mantener agente actual
  return {
    type: INTENT_TYPES.MAINTAIN,
    targetAgent: currentAgent,
    reason: 'no_explicit_trigger',
    isValid: true
  };
}

/**
 * Decide qué agente debe responder basado en intención resuelta
 * (Reemplaza a decidirAgente del orquestador)
 * 
 * @param {Object} intent - Resultado de resolveIntent()
 * @param {string} activeAgent - Agente actualmente activo
 * @returns {string} - Agente que debe responder
 */
export function decideResponder(intent, activeAgent) {
  if (!intent || !intent.isValid) {
    console.warn('[INTENT-V2] Intent inválido, usando agente actual');
    return activeAgent;
  }
  
  switch (intent.type) {
    case INTENT_TYPES.HANDOFF:
      // Cambiar a nuevo agente
      console.log(`[INTENT-V2] 🔀 Handoff: ${activeAgent} → ${intent.targetAgent}`);
      return intent.targetAgent;
      
    case INTENT_TYPES.SUGGESTION:
    case INTENT_TYPES.MAINTAIN:
    case INTENT_TYPES.INVALID:
    default:
      // Mantener agente actual
      return activeAgent;
  }
}

/**
 * Genera mensaje de error para transiciones inválidas
 * @param {Object} intent - Intent con type === INVALID
 * @param {string} userName - Nombre del usuario
 * @returns {string} - Mensaje de error amigable
 */
export function getInvalidTransitionMessage(intent, userName = 'amigo') {
  if (intent.type !== INTENT_TYPES.INVALID) {
    return null;
  }
  
  const { fromAgent, requestedAgent } = intent;
  
  // Mensaje genérico amigable
  return `Hola ${userName}, para hablar con @${requestedAgent.toLowerCase()} primero necesitas volver con @aurora 😊

Escribe: @aurora + tu consulta

Aurora te conectará con quien necesites.`;
}

/**
 * Log detallado de intent para debugging
 * @param {Object} intent - Resultado de resolveIntent()
 */
export function logIntent(intent) {
  const symbols = {
    HANDOFF: '🔀',
    SUGGESTION: '💡',
    MAINTAIN: '🔒',
    INVALID: '❌'
  };
  
  const symbol = symbols[intent.type] || '❓';
  
  if (intent.type === INTENT_TYPES.HANDOFF) {
    console.log(`[INTENT-V2] ${symbol} ${intent.fromAgent} → ${intent.targetAgent} (${intent.reason})`);
  } else if (intent.type === INTENT_TYPES.SUGGESTION) {
    console.log(`[INTENT-V2] ${symbol} Sugerencia: ${intent.suggestedAgent} desde ${intent.targetAgent}`);
  } else {
    console.log(`[INTENT-V2] ${symbol} ${intent.type}: ${intent.reason}`);
  }
}

export default {
  INTENT_TYPES,
  resolveIntent,
  decideResponder,
  getInvalidTransitionMessage,
  logIntent
};
