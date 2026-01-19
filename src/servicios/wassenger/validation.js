/**
 * ✅ Wassenger Validation - Validaciones de mensajes y detección de bots
 * Filtra mensajes inválidos, bots, mensajes viejos, etc.
 */

import { isGroupOrBroadcast } from './helpers.js';

/**
 * 🤖 Detecta si mensaje proviene de bot (light detection)
 * Mantiene validación mínima para no bloquear humanos por error
 */
export function detectBotLight(data, userId) {
  // Flags explícitos de bot
  if (data.isBot === true || data.type === 'bot' || data.fromBot === true) {
    return { detected: true, reason: 'explicit_isBot' };
  }
  
  // Grupos y broadcasts
  if (isGroupOrBroadcast(userId)) {
    return { detected: true, reason: 'group_or_broadcast' };
  }
  
  return { detected: false, reason: null };
}

/**
 * ⏰ Verifica si mensaje es viejo (más de 2 minutos)
 * Evita procesar mensajes atrasados del webhook
 */
export function isOldMessage(data) {
  if (!data.timestamp) return false;
  
  const nowSeconds = Math.floor(Date.now() / 1000);
  const messageAge = nowSeconds - data.timestamp;
  
  // Si el mensaje tiene más de 2 minutos (120 segundos)
  return messageAge > 120;
}

/**
 * 👋 Verifica si es saludo casual sin intención de servicio
 */
export function isCasualGreetingOnly(text) {
  if (!text) return false;
  
  const casualGreetings = [
    /^(hola|hi|hello|hey|buenas|buen día|buenos días|buenas tardes|buenas noches)$/i,
    /^(hola|hi|hello|hey)\s*[!.]*$/i
  ];
  
  return casualGreetings.some(pattern => pattern.test(text.trim()));
}

/**
 * 📅 Verifica si mensaje tiene intención de reserva
 */
export function isReservationIntent(text) {
  if (!text) return false;
  
  const reservationKeywords = [
    /\b(reserv|reserva|reservar|agendar|agenda|reservación)\b/i,
    /\b(sala|espacio|oficina|hot\s*desk|day\s*pass)\b/i,
    /\b(disponibilidad|disponible|libre)\b/i
  ];
  
  return reservationKeywords.some(pattern => pattern.test(text));
}

/**
 * 🔍 Detecta si mensaje es continuación de formulario de reserva
 * Reconoce patrones como: email, "ya te dije", horarios, fechas, personas
 */
export function detectFormContinuation(text) {
  if (!text) return false;
  
  const continuationPatterns = [
    /mi\s+(email|correo|mail|e-mail)/i,
    /ya\s+te\s+(dije|dij[eé]|mencion[eé]|coment[eé]|dí|di)/i,
    /te\s+(dije|mencion[eé]|coment[eé])/i,
    /somos\s+\d+/i,
    /\d+\s+personas?/i,
    /(voy|vamos|iremos)\s+(con|a ser)/i,
    /mi\s+nombre\s+es/i,
    /\w+@\w+\.\w+/i, // Email pattern
    /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/i, // Fecha completa
    /(mañana|ma\u00f1ana|hoy|pasado\s+ma\u00f1ana|tarde|noche)/i,
    /(\d{1,2})(:|\.)?(\d{2})?\s*(am|pm|AM|PM)/i, // Horarios
    /a\s+las\s+\d+/i, // "a las 9"
    /para\s+(hoy|mañana|ma\u00f1ana)/i,
    /el\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i
  ];
  
  return continuationPatterns.some(pattern => pattern.test(text));
}

/**
 * 🛡️ Valida que el mensaje sea procesable
 * Retorna { valid: boolean, reason: string }
 */
export function validateMessage({ data, userId, text }) {
  // Verificar bot
  const botCheck = detectBotLight(data, userId);
  if (botCheck.detected) {
    return { valid: false, reason: botCheck.reason };
  }
  
  // Verificar mensaje viejo
  if (isOldMessage(data)) {
    return { valid: false, reason: 'message_too_old' };
  }
  
  // Verificar que no sea mensaje saliente (fromMe)
  if (data.fromMe === true) {
    return { valid: false, reason: 'outgoing_message' };
  }
  
  // Si no hay texto ni media, ignorar
  if (!text && !data.mediaUrl && !data.media?.url) {
    return { valid: false, reason: 'empty_message' };
  }
  
  return { valid: true, reason: null };
}
