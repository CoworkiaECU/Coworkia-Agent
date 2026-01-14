/**
 * 🚦 RATE LIMITER - Sistema de control de tráfico por usuario
 * Previene spam y abuso mediante ventanas deslizantes (sliding window)
 */

import { loggers } from './logger.js';

// Configuración desde ENV con defaults sensatos
const LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '10', 10);
const LIMIT_PER_HOUR = parseInt(process.env.RATE_LIMIT_PER_HOUR || '100', 10);

// Storage en memoria: userId -> { minute: [timestamps], hour: [timestamps] }
const userLimits = new Map();

/**
 * Limpia timestamps antiguos fuera de las ventanas de tiempo
 */
function cleanupOldEntries(userId) {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const userLimit = userLimits.get(userId);
  if (!userLimit) return;
  
  // Filtrar timestamps dentro de ventanas válidas
  userLimit.minute = userLimit.minute.filter(ts => ts > oneMinuteAgo);
  userLimit.hour = userLimit.hour.filter(ts => ts > oneHourAgo);
  
  // Si ya no hay mensajes recientes, eliminar entrada
  if (userLimit.minute.length === 0 && userLimit.hour.length === 0) {
    userLimits.delete(userId);
  }
}

/**
 * Verifica si el usuario puede enviar un mensaje
 * @param {string} userId - ID del usuario (número WhatsApp)
 * @returns {Object} { allowed: boolean, retryAfter: number, reason: string }
 */
export function checkRateLimit(userId) {
  if (!userId) {
    return { allowed: true, retryAfter: 0, reason: null };
  }
  
  // Limpiar timestamps antiguos
  cleanupOldEntries(userId);
  
  const userLimit = userLimits.get(userId);
  
  // Primera vez que escribe - permitir
  if (!userLimit) {
    return { allowed: true, retryAfter: 0, reason: null };
  }
  
  const now = Date.now();
  
  // Verificar límite por minuto
  if (userLimit.minute.length >= LIMIT_PER_MINUTE) {
    const oldestInMinute = userLimit.minute[0];
    const retryAfter = Math.ceil((oldestInMinute + 60 * 1000 - now) / 1000);
    
    loggers.webhook.warn('Rate limit exceeded (per minute)', {
      userId,
      current: userLimit.minute.length,
      limit: LIMIT_PER_MINUTE,
      retryAfter
    });
    
    return {
      allowed: false,
      retryAfter,
      reason: 'minute_limit',
      current: userLimit.minute.length,
      limit: LIMIT_PER_MINUTE
    };
  }
  
  // Verificar límite por hora
  if (userLimit.hour.length >= LIMIT_PER_HOUR) {
    const oldestInHour = userLimit.hour[0];
    const retryAfter = Math.ceil((oldestInHour + 60 * 60 * 1000 - now) / 1000);
    
    loggers.webhook.warn('Rate limit exceeded (per hour)', {
      userId,
      current: userLimit.hour.length,
      limit: LIMIT_PER_HOUR,
      retryAfter
    });
    
    return {
      allowed: false,
      retryAfter,
      reason: 'hour_limit',
      current: userLimit.hour.length,
      limit: LIMIT_PER_HOUR
    };
  }
  
  return { allowed: true, retryAfter: 0, reason: null };
}

/**
 * Registra un mensaje procesado para el usuario
 * @param {string} userId - ID del usuario
 */
export function recordMessage(userId) {
  if (!userId) return;
  
  const now = Date.now();
  
  if (!userLimits.has(userId)) {
    userLimits.set(userId, {
      minute: [],
      hour: []
    });
  }
  
  const userLimit = userLimits.get(userId);
  userLimit.minute.push(now);
  userLimit.hour.push(now);
  
  // Debug en modo desarrollo
  if (process.env.DEBUG_RATE_LIMIT === 'true') {
    loggers.webhook.debug('Message recorded', {
      userId,
      minuteCount: userLimit.minute.length,
      hourCount: userLimit.hour.length
    });
  }
}

/**
 * Obtiene estadísticas de uso para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Object} { messagesLastMinute, messagesLastHour }
 */
export function getUserStats(userId) {
  if (!userId) return { messagesLastMinute: 0, messagesLastHour: 0 };
  
  cleanupOldEntries(userId);
  
  const userLimit = userLimits.get(userId);
  if (!userLimit) {
    return { messagesLastMinute: 0, messagesLastHour: 0 };
  }
  
  return {
    messagesLastMinute: userLimit.minute.length,
    messagesLastHour: userLimit.hour.length,
    limitPerMinute: LIMIT_PER_MINUTE,
    limitPerHour: LIMIT_PER_HOUR
  };
}

/**
 * Resetea límites para un usuario específico (admin)
 * @param {string} userId - ID del usuario
 */
export function resetUserLimit(userId) {
  if (!userId) return false;
  
  const existed = userLimits.has(userId);
  userLimits.delete(userId);
  
  loggers.webhook.info('Rate limit reset', { userId, existed });
  return existed;
}

/**
 * Limpieza periódica de entradas antiguas (ejecutar cada 5 min)
 */
export function cleanupAll() {
  const before = userLimits.size;
  
  for (const userId of userLimits.keys()) {
    cleanupOldEntries(userId);
  }
  
  const after = userLimits.size;
  const cleaned = before - after;
  
  if (cleaned > 0) {
    loggers.webhook.debug('Rate limiter cleanup', { before, after, cleaned });
  }
}

// Auto-limpieza cada 5 minutos
setInterval(cleanupAll, 5 * 60 * 1000);

export default {
  checkRateLimit,
  recordMessage,
  getUserStats,
  resetUserLimit,
  cleanupAll
};
