/**
 * 🎯 Aurora Coordinator - Sistema Inteligente de Coordinación Multi-Agente
 * 
 * Gestiona conversaciones por tópicos usando la base de datos unificada
 * Decide qué agente debe responder según contexto y tema activo
 */

import { conversationAdapter } from '../database/conversationAdapter.js';

/**
 * 📊 Tipos de tópicos reconocidos
 */
export const TOPICS = {
  RESERVA: 'reserva_espacio',
  COLISION: 'reparacion_vehicular', 
  SEGURO: 'seguro_vehicular',
  MARKETING: 'marketing_ia',
  SALUD: 'salud_bienestar',
  FINANZAS: 'finanzas_contabilidad',
  PLANES: 'planes_membresias',
  GENERAL: 'informacion_general'
};

/**
 * 🤖 Mapeo de tópicos a agentes
 */
const TOPIC_TO_AGENT = {
  [TOPICS.RESERVA]: 'AURORA',
  [TOPICS.COLISION]: 'AXEL',
  [TOPICS.SEGURO]: 'ADRIANA',
  [TOPICS.MARKETING]: 'ENZO',
  [TOPICS.SALUD]: 'ANGELA',
  [TOPICS.FINANZAS]: 'GABI',
  [TOPICS.PLANES]: 'ALUNA',
  [TOPICS.GENERAL]: 'AURORA'
};

/**
 * 🔍 Detecta tópico de conversación desde mensaje del usuario
 */
export function detectTopicFromMessage(message, context = {}) {
  const msgLower = message.toLowerCase();
  
  // Keywords por tópico (orden de prioridad)
  if (msgLower.match(/@axel|colision|choque|golpe|parachoques|abolladura|rayón|pintura auto|enderezada/)) {
    return TOPICS.COLISION;
  }
  
  if (msgLower.match(/@adriana|seguro|póliza|cobertura|reclamo|siniestro/)) {
    return TOPICS.SEGURO;
  }
  
  if (msgLower.match(/@enzo|marketing|publicidad|campaña|contenido|anuncios|redes sociales|ia marketing/)) {
    return TOPICS.MARKETING;
  }
  
  if (msgLower.match(/@angela|salud|médico|cita médica|consulta salud|bienestar|medicina/)) {
    return TOPICS.SALUD;
  }
  
  if (msgLower.match(/@gabi|contabilidad|finanzas|impuestos|factura|declaración|sri|uafe/)) {
    return TOPICS.FINANZAS;
  }
  
  if (msgLower.match(/@aluna|plan|membresía|mensualidad|suscripción/)) {
    return TOPICS.PLANES;
  }
  
  if (msgLower.match(/reserva|sala|hot desk|escritorio|espacio|horario|disponibilidad|agendar/)) {
    return TOPICS.RESERVA;
  }
  
  return TOPICS.GENERAL;
}

/**
 * 🎯 Obtiene el agente apropiado para un tópico
 */
export function getAgentForTopic(topic) {
  return TOPIC_TO_AGENT[topic] || 'AURORA';
}

/**
 * 📋 Obtiene tópicos activos del usuario
 */
export async function getUserActiveTopics(userId) {
  try {
    const topics = await conversationAdapter.getActiveTopics(userId);
    return topics;
  } catch (error) {
    console.error('[AURORA COORDINATOR] ❌ Error obteniendo tópicos:', error);
    return [];
  }
}

/**
 * 🔄 Cambia el tópico activo del usuario
 */
export async function switchTopic(userId, newTopic, agent, metadata = {}) {
  try {
    // Cerrar tópico anterior si existe
    const activeTopics = await getUserActiveTopics(userId);
    const previousTopic = activeTopics.find(t => t.agent === agent);
    
    if (previousTopic) {
      await conversationAdapter.updateTopicStatus(
        userId, 
        previousTopic.topic, 
        'paused',
        { pausedAt: new Date().toISOString(), reason: 'topic_switch' }
      );
    }
    
    // Activar nuevo tópico
    const result = await conversationAdapter.setActiveTopic(
      userId,
      newTopic,
      agent,
      metadata
    );
    
    console.log(`[AURORA COORDINATOR] ✅ Tópico cambiado: ${previousTopic?.topic || 'ninguno'} → ${newTopic}`);
    return result;
    
  } catch (error) {
    console.error('[AURORA COORDINATOR] ❌ Error cambiando tópico:', error);
    return null;
  }
}

/**
 * 🧠 Decide si Aurora debe hacer handover a otro agente
 */
export async function shouldHandover(userId, message, currentAgent) {
  // Si ya estamos en agente especializado, continuar con él
  if (currentAgent !== 'AURORA') {
    // Verificar si usuario menciona explícitamente a Aurora
    if (message.toLowerCase().includes('@aurora')) {
      return { handover: true, targetAgent: 'AURORA', reason: 'explicit_mention' };
    }
    
    // Verificar si usuario menciona otro agente
    const mentionedAgent = detectMentionedAgent(message);
    if (mentionedAgent && mentionedAgent !== currentAgent) {
      return { handover: true, targetAgent: mentionedAgent, reason: 'agent_switch' };
    }
    
    return { handover: false };
  }
  
  // Aurora está activa - detectar si debe derivar
  const detectedTopic = detectTopicFromMessage(message);
  const targetAgent = getAgentForTopic(detectedTopic);
  
  // Si el tópico requiere agente especializado (no Aurora)
  if (targetAgent !== 'AURORA') {
    return { 
      handover: true, 
      targetAgent, 
      topic: detectedTopic,
      reason: 'topic_specialization' 
    };
  }
  
  return { handover: false };
}

/**
 * 🔍 Detecta mención explícita de agente (@agente)
 * Case-insensitive y reconoce @ángela / @angela
 */
function detectMentionedAgent(message) {
  const msgLower = message.toLowerCase();
  
  // Normalizar: convertir á → a para facilitar matching
  const msgNormalized = msgLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const mentions = {
    '@aurora': 'AURORA',
    '@axel': 'AXEL',
    '@adriana': 'ADRIANA',
    '@enzo': 'ENZO',
    '@angela': 'ANGELA',  // Funciona para @angela y @ángela (normalizado)
    '@gabi': 'GABI',
    '@aluna': 'ALUNA'
  };
  
  for (const [mention, agent] of Object.entries(mentions)) {
    if (msgNormalized.includes(mention)) {
      return agent;
    }
  }
  
  return null;
}

/**
 * 💬 Genera mensaje de handover empático
 */
export function generateHandoverMessage(fromAgent, toAgent, userName, topic) {
  const messages = {
    AURORA_TO_AXEL: `Perfecto ${userName}! 🚗\n\nTe conecto con *Axel* de *The PaintBull*.\nÉl analiza fotos de tu vehículo y te da cotización en minutos.\n\n*Axel*, te presento a ${userName}.\n\nCualquier cosa, mencióname con *@Aurora* ✨`,
    
    AURORA_TO_ADRIANA: `Entendido ${userName}! 🛡️\n\nTe conecto con *Adriana* de *PlusSecure*.\nElla te ayudará con tu seguro vehicular.\n\n*Adriana*, te presento a ${userName}.\n\nEstoy por aquí si necesitas: *@Aurora*`,
    
    AURORA_TO_ENZO: `Perfecto ${userName}! 💡\n\nTe conecto con *Enzo* del *MarketingLab*.\nExperto en campañas, contenido y automatización con IA.\n\n*Enzo*, te presento a ${userName}.\n\nPara volver conmigo: *@Aurora* ✨`,
    
    AURORA_TO_ANGELA: `Claro ${userName}! 💚\n\nTe conecto con *Ángela* de *MedBeneficios*.\nElla coordina citas médicas y procesa documentos de salud.\n\n*Ángela*, te presento a ${userName}.\n\nAquí estoy: *@Aurora*`,
    
    AURORA_TO_GABI: `Perfecto ${userName}! 💼\n\nTe conecto con *Gabi* de *GR Consulting*.\nEspecialista en finanzas, contabilidad y compliance.\n\n*Gabi*, te presento a ${userName}.\n\nCualquier cosa: *@Aurora* ✨`,
    
    AURORA_TO_ALUNA: `Genial ${userName}! 📋\n\nTe conecto con *Aluna* - especialista en planes.\nTe ayudará a encontrar la membresía perfecta.\n\n*Aluna*, te presento a ${userName}.\n\nEstoy aquí: *@Aurora*`,
    
    BACK_TO_AURORA: `De vuelta contigo ${userName}! ✨\n\n¿En qué más puedo ayudarte?`
  };
  
  const key = `${fromAgent}_TO_${toAgent}`;
  return messages[key] || messages.BACK_TO_AURORA;
}

/**
 * 📊 Obtiene resumen de conversación para Aurora
 */
export async function getConversationSummaryForAurora(userId, lastNMessages = 10) {
  try {
    const summary = await conversationAdapter.getConversationSummaryForAurora(userId, lastNMessages);
    return summary;
  } catch (error) {
    console.error('[AURORA COORDINATOR] ❌ Error obteniendo resumen:', error);
    return null;
  }
}

/**
 * 🔄 Gestiona el ciclo completo de handover
 */
export async function executeHandover(userId, userName, fromAgent, toAgent, topic, message) {
  try {
    console.log(`[AURORA COORDINATOR] 🔄 Handover: ${fromAgent} → ${toAgent}`);
    
    // 1. Cambiar tópico activo
    await switchTopic(userId, topic, toAgent, {
      handoverFrom: fromAgent,
      handoverAt: new Date().toISOString(),
      originalMessage: message
    });
    
    // 2. Guardar mensaje de handover
    const handoverMsg = generateHandoverMessage(fromAgent, toAgent, userName, topic);
    await conversationAdapter.saveConversationMessage(
      userId,
      'system',
      handoverMsg,
      topic,
      { type: 'handover', from: fromAgent, to: toAgent }
    );
    
    // 3. Retornar información del handover
    return {
      success: true,
      newAgent: toAgent,
      newTopic: topic,
      handoverMessage: handoverMsg
    };
    
  } catch (error) {
    console.error('[AURORA COORDINATOR] ❌ Error ejecutando handover:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🧹 Limpia tópicos antiguos inactivos (7+ días)
 */
export async function cleanupOldTopics(userId, daysOld = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const activeTopics = await getUserActiveTopics(userId);
    let cleaned = 0;
    
    for (const topic of activeTopics) {
      const lastUpdate = new Date(topic.updated_at);
      if (lastUpdate < cutoffDate && topic.status !== 'completed') {
        await conversationAdapter.updateTopicStatus(
          userId,
          topic.topic,
          'expired',
          { expiredAt: new Date().toISOString(), autoExpired: true }
        );
        cleaned++;
      }
    }
    
    console.log(`[AURORA COORDINATOR] 🧹 Limpiados ${cleaned} tópicos antiguos`);
    return cleaned;
    
  } catch (error) {
    console.error('[AURORA COORDINATOR] ❌ Error limpiando tópicos:', error);
    return 0;
  }
}
