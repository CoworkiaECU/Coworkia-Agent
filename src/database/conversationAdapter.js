/**
 * 🔄 Conversation Adapter - Capa de compatibilidad y migración
 * 
 * Este módulo actúa como puente entre el sistema antiguo (interactions, conversation_history)
 * y el nuevo sistema unificado (agent_conversations, conversation_files, active_topics).
 * 
 * ESTRATEGIA:
 * - Guarda en AMBOS sistemas durante la transición
 * - Lee del nuevo sistema primero, fallback al antiguo
 * - Permite migración gradual sin romper código existente
 * 
 * @version 1.0.0
 */

import conversationRepository from './conversationRepository.js';
import { 
  saveInteraction as legacySaveInteraction,
  loadConversationHistory as legacyLoadHistory,
  saveConversationMessage as legacySaveMessage
} from '../perfiles-interacciones/memoria-sqlite.js';

/**
 * 💬 Guarda mensaje de conversación (versión dual)
 * Guarda en nuevo sistema Y mantiene compatibilidad con legacy
 * 
 * @param {string} userId - Teléfono del usuario
 * @param {object|string} message - Mensaje (objeto con role/content/agent o string)
 * @param {string} [role='user'] - Rol si message es string
 * @param {object} [options] - Opciones adicionales
 * @param {string} [options.topic] - Tema de conversación (se detecta automáticamente si no se proporciona)
 * @param {object} [options.metadata] - Metadata adicional
 * @returns {Promise<object>} Resultado con IDs de ambos sistemas
 */
export async function saveConversationMessage(userId, message, role = 'user', options = {}) {
  try {
    // Extraer datos del mensaje
    const isObjectMessage = typeof message === 'object' && message.content;
    const content = isObjectMessage ? message.content : message;
    const actualRole = isObjectMessage ? message.role : role;
    const agentName = isObjectMessage && message.agent ? message.agent : 'Aurora';
    const agentKey = agentName.toLowerCase();
    
    // Detectar tema automáticamente si no se proporciona
    const topic = options.topic || detectTopicFromContent(content, agentKey);
    
    // Preparar metadata
    const metadata = {
      ...options.metadata,
      legacy_compatible: true,
      timestamp: new Date().toISOString()
    };
    
    // Guardar en nuevo sistema
    const newSystemResult = await conversationRepository.saveMessage({
      userPhone: userId,
      agent: agentKey,
      topic: topic,
      role: actualRole,
      content: content,
      metadata: metadata,
      sessionId: options.sessionId
    });
    
    // Guardar en sistema legacy para compatibilidad
    await legacySaveMessage(userId, message, role);
    
    console.log(`[CONV-ADAPTER] ✅ Mensaje guardado en ambos sistemas: ${agentKey}/${topic}`);
    
    return {
      success: true,
      newSystem: newSystemResult,
      agent: agentKey,
      topic: topic
    };
    
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error guardando mensaje:', error);
    // Fallback: al menos guardar en legacy
    await legacySaveMessage(userId, message, role);
    return { success: false, error: error.message };
  }
}

/**
 * 📜 Carga historial de conversación (versión dual)
 * Lee del nuevo sistema primero, fallback al legacy si es necesario
 * 
 * @param {string} userId - Teléfono del usuario
 * @param {number} [limit=10] - Límite de mensajes
 * @param {object} [options] - Opciones adicionales
 * @param {string} [options.agent] - Filtrar por agente específico
 * @param {string} [options.topic] - Filtrar por tema específico
 * @param {boolean} [options.newOnly=false] - Solo leer del nuevo sistema
 * @returns {Promise<Array>} Array de mensajes
 */
export async function loadConversationHistory(userId, limit = 10, options = {}) {
  try {
    let messages = [];
    
    // Intentar leer del nuevo sistema
    if (options.agent && options.topic) {
      // Si especifica agente y tema, usar búsqueda específica
      messages = await conversationRepository.getConversationByTopic(
        userId, 
        options.agent, 
        options.topic, 
        limit
      );
    } else if (options.agent) {
      // Solo agente especificado
      messages = await conversationRepository.getAgentConversation(
        userId, 
        options.agent, 
        limit
      );
    } else {
      // Sin filtros específicos, intentar obtener del legacy
      if (!options.newOnly) {
        messages = await legacyLoadHistory(userId, limit);
      }
    }
    
    // Normalizar formato para compatibilidad
    return messages.map(msg => ({
      ...msg,
      role: msg.role || (msg.output ? 'assistant' : 'user'),
      content: msg.content || msg.output || msg.input || '',
      agent: msg.agent || 'aurora',
      timestamp: msg.timestamp
    }));
    
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error cargando historial:', error);
    
    // Fallback al sistema legacy
    if (!options.newOnly) {
      return await legacyLoadHistory(userId, limit);
    }
    
    return [];
  }
}

/**
 * 💾 Guarda interacción (versión dual - mantiene compatibilidad total)
 * 
 * @param {object} interactionData - Datos de la interacción
 * @param {string} interactionData.userId - Teléfono del usuario
 * @param {string} interactionData.agent - Código del agente
 * @param {string} interactionData.agentName - Nombre del agente
 * @param {string} interactionData.intentReason - Razón de la intención
 * @param {string} interactionData.input - Input del usuario
 * @param {string} interactionData.output - Output del agente
 * @param {object} [interactionData.meta] - Metadata adicional
 * @returns {Promise<boolean>} true si se guardó exitosamente
 */
export async function saveInteraction(interactionData) {
  try {
    const { userId, agent, agentName, intentReason, input, output, meta = {} } = interactionData;
    
    // Detectar tema del intentReason
    const topic = intentReason || 'general';
    
    // Guardar mensajes individuales en el nuevo sistema
    const promises = [];
    
    if (input && input.trim()) {
      promises.push(
        conversationRepository.saveMessage({
          userPhone: userId,
          agent: agent,
          topic: topic,
          role: 'user',
          content: input,
          metadata: { ...meta, intent_reason: intentReason }
        })
      );
    }
    
    if (output && output.trim()) {
      promises.push(
        conversationRepository.saveMessage({
          userPhone: userId,
          agent: agent,
          topic: topic,
          role: 'assistant',
          content: output,
          metadata: { ...meta, intent_reason: intentReason, agent_name: agentName }
        })
      );
    }
    
    await Promise.all(promises);
    
    // Guardar en sistema legacy para compatibilidad
    await legacySaveInteraction(interactionData);
    
    console.log(`[CONV-ADAPTER] ✅ Interacción guardada en ambos sistemas: ${agent}/${topic}`);
    
    return true;
    
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error guardando interacción:', error);
    // Fallback: al menos guardar en legacy
    await legacySaveInteraction(interactionData);
    return false;
  }
}

/**
 * 🎯 Obtiene temas activos de un usuario
 * 
 * @param {string} userId - Teléfono del usuario
 * @param {string} [agent] - Filtrar por agente específico
 * @returns {Promise<Array>} Array de temas activos
 */
export async function getActiveTopics(userId, agent = null) {
  try {
    return await conversationRepository.getActiveTopics(userId, agent);
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error obteniendo temas activos:', error);
    return [];
  }
}

/**
 * 📊 Obtiene resumen de conversaciones para Aurora
 * 
 * @param {string} userId - Teléfono del usuario
 * @returns {Promise<object>} Resumen por agente
 */
export async function getConversationSummary(userId) {
  try {
    return await conversationRepository.getConversationSummaryForAurora(userId);
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error obteniendo resumen:', error);
    return {};
  }
}

/**
 * 📸 Guarda archivo adjunto
 * 
 * @param {object} params - Parámetros del archivo
 * @returns {Promise<object>} Resultado de guardado
 */
export async function saveFile(params) {
  try {
    return await conversationRepository.saveFile(params);
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error guardando archivo:', error);
    throw error;
  }
}

/**
 * 🖼️ Obtiene archivos de un tema
 * 
 * @param {string} userId - Teléfono del usuario
 * @param {string} agent - Código del agente
 * @param {string} topic - Tema de conversación
 * @param {string} [fileType] - Tipo de archivo (opcional)
 * @returns {Promise<Array>} Array de archivos
 */
export async function getFilesForTopic(userId, agent, topic, fileType = null) {
  try {
    return await conversationRepository.getFilesForTopic(userId, agent, topic, fileType);
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error obteniendo archivos:', error);
    return [];
  }
}

/**
 * ✅ Completa un tema
 * 
 * @param {string} userId - Teléfono del usuario
 * @param {string} agent - Código del agente
 * @param {string} topic - Tema de conversación
 * @returns {Promise<boolean>} true si se completó exitosamente
 */
export async function completeTopic(userId, agent, topic) {
  try {
    return await conversationRepository.completeTopicconversation(userId, agent, topic);
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error completando tema:', error);
    return false;
  }
}

/**
 * ⏸️ Pausa un tema
 * 
 * @param {string} userId - Teléfono del usuario
 * @param {string} agent - Código del agente
 * @param {string} topic - Tema de conversación
 * @returns {Promise<boolean>} true si se pausó exitosamente
 */
export async function pauseTopic(userId, agent, topic) {
  try {
    return await conversationRepository.pauseTopic(userId, agent, topic);
  } catch (error) {
    console.error('[CONV-ADAPTER] ❌ Error pausando tema:', error);
    return false;
  }
}

/**
 * 🧠 Detecta tema de conversación automáticamente
 * 
 * @param {string} content - Contenido del mensaje
 * @param {string} agent - Agente que procesa
 * @returns {string} Tema detectado
 */
function detectTopicFromContent(content, agent) {
  const contentLower = content.toLowerCase();
  
  // Temas específicos por agente
  const topicPatterns = {
    axel: {
      collision_quote: ['colisión', 'choque', 'accidente', 'cotización', 'rayón', 'abolladura', 'pintura'],
      repair_status: ['estado', 'avance', 'listo', 'cuánto falta'],
      payment: ['pago', 'precio', 'cuánto cuesta', 'cobro']
    },
    gaby: {
      consulting: ['consultoría', 'asesoría', 'finanzas', 'legal', 'rrhh'],
      meeting_request: ['reunión', 'cita', 'encontrarnos', 'oficina'],
      project_quote: ['cotización', 'proyecto', 'cuánto cuesta', 'presupuesto']
    },
    aurora: {
      reservation: ['reservar', 'reserva', 'sala', 'hot desk', 'escritorio'],
      membership: ['membresía', 'plan', 'mensual', 'suscripción'],
      general_info: ['qué es', 'servicios', 'horario', 'dirección']
    }
  };
  
  // Detectar tema basado en palabras clave
  const agentTopics = topicPatterns[agent] || {};
  
  for (const [topic, keywords] of Object.entries(agentTopics)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      return topic;
    }
  }
  
  // Tema por defecto según agente
  const defaultTopics = {
    axel: 'collision_quote',
    gaby: 'consulting',
    aurora: 'general_info',
    enzo: 'marketing_inquiry',
    adriana: 'insurance_quote',
    aluna: 'membership_inquiry',
    angela: 'health_services'
  };
  
  return defaultTopics[agent] || 'general';
}

// Export como objeto y named export
const conversationAdapter = {
  saveConversationMessage,
  loadConversationHistory,
  saveInteraction,
  getActiveTopics,
  getConversationSummary,
  saveFile,
  getFilesForTopic,
  completeTopic,
  pauseTopic,
  // Métodos del repository
  setActiveTopic: conversationRepository.setActiveTopic,
  updateTopicStatus: conversationRepository.updateTopicStatus,
  getConversationSummaryForAurora: conversationRepository.getConversationSummaryForAurora
};

export { conversationAdapter };
export default conversationAdapter;
