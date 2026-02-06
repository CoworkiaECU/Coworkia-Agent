/**
 * 🎯 Topic Manager - Sistema de Gestión de Tópicos de Conversación
 * 
 * Gestiona conversaciones por tópicos usando la base de datos unificada.
 * Detecta el tema activo y asigna el agente apropiado.
 * 
 * ⚠️ IMPORTANTE: Sistema de handoffs unificado
 * 
 * Los handoffs (relevos entre agentes) se manejan EXCLUSIVAMENTE en:
 * - src/deteccion-intenciones/handoff-messages.js → getHandoffMessages() (mensajes multiidioma)
 * - src/express-servidor/endpoints-api/wassenger.js → lógica de ejecución con delays
 * 
 * Este archivo SOLO maneja:
 * - Detección de tópicos
 * - Mapeo tópico → agente
 * - Gestión de tópicos activos/pausados en BD
 * 
 * NO maneja handoffs para evitar duplicación.
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
    console.error('[TOPIC MANAGER] ❌ Error obteniendo tópicos:', error);
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
    
    console.log(`[TOPIC MANAGER] ✅ Tópico cambiado: ${previousTopic?.topic || 'ninguno'} → ${newTopic}`);
    return result;
    
  } catch (error) {
    console.error('[TOPIC MANAGER] ❌ Error cambiando tópico:', error);
    return null;
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
    
    console.log(`[TOPIC MANAGER] 🧹 Limpiados ${cleaned} tópicos antiguos`);
    return cleaned;
    
  } catch (error) {
    console.error('[TOPIC MANAGER] ❌ Error limpiando tópicos:', error);
    return 0;
  }
}
