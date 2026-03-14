/**
 * 🗓️ AXEL APPOINTMENT SERVICE
 * Detecta la intención de agendar una inspección en taller y guarda la cita en DB.
 * Reutiliza los parsers de fecha/hora ya existentes en el ecosistema.
 */

import { parseDate, normalizeTimeFormat } from '../utils/date-time-parser.js';
import { scheduleWorkshopInspection } from '../database/axelRepository.js';

// Palabras clave que sugieren que el usuario quiere agendar
const SCHEDULING_KEYWORDS = [
  'agendar', 'agenda', 'quiero el', 'quiero ir', 'me queda',
  'puedo el', 'voy el', 'este lunes', 'este martes', 'este miércoles',
  'este jueves', 'este viernes', 'este sábado', 'el lunes', 'el martes',
  'el miércoles', 'el jueves', 'el viernes', 'el sábado', 'mañana',
  'pasado mañana', 'hoy', 'esta semana', 'la próxima semana',
  'próxima semana', 'confirmo', 'confirmar', 'llevar'
];

// Expresiones de tiempo para extraer hora del mensaje
const TIME_REGEX = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\b/i;

/**
 * 🔍 Detecta si el mensaje expresa intención de agendar una cita de taller
 * @param {string} message
 * @returns {{ detected: boolean, dateStr: string|null, timeStr: string|null }}
 */
export function detectSchedulingIntent(message) {
  if (!message) return { detected: false, dateStr: null, timeStr: null };

  const lower = message.toLowerCase();
  const hasKeyword = SCHEDULING_KEYWORDS.some(kw => lower.includes(kw));

  if (!hasKeyword) return { detected: false, dateStr: null, timeStr: null };

  // Intentar parsear fecha
  let dateStr = null;
  try {
    dateStr = parseDate(message);
  } catch {
    dateStr = null;
  }

  // Intentar extraer hora
  let timeStr = null;
  const timeMatch = message.match(TIME_REGEX);
  if (timeMatch) {
    timeStr = normalizeTimeFormat(timeMatch[1]);
  }

  return { detected: true, dateStr, timeStr };
}

/**
 * 🗓️ Procesa el agendamiento de taller para una cotización pendiente
 * @param {string} quoteCode  - Código de cotización (ej: "SIN-20241201-0001")
 * @param {string} message    - Mensaje del usuario con fecha/hora preferida
 * @param {string} clientName - Nombre del cliente para el mensaje de confirmación
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function processWorkshopScheduling(quoteCode, message, clientName) {
  try {
    const { detected, dateStr, timeStr } = detectSchedulingIntent(message);

    if (!detected || !dateStr) {
      return {
        success: false,
        message: `No capté la fecha exacta 😅 Escríbeme así:\n\n*"El martes 10 a las 9am"*\nor *"Mañana en la mañana"*\n\nLun–Vie 8am–6pm · Sáb 8am–1pm 📍`
      };
    }

    const finalTime = timeStr || '09:00';

    await scheduleWorkshopInspection(quoteCode, dateStr, finalTime);

    const firstName = (clientName || '').split(' ')[0] || 'Listo';

    // Formatear fecha legible para el cliente
    const dateReadable = formatDateReadable(dateStr);

    return {
      success: true,
      message: `✅ ¡Perfecto, ${firstName}! Tu inspección está agendada:\n\n📅 *${dateReadable}* a las *${formatTime12h(finalTime)}*\n📍 Av. Gonzalo Escudero N44-53, Quito\n\nAxel te espera con el equipo listo 🔧🚗\n\n¿Tienes alguna pregunta antes de tu cita? Con gusto te ayudo.`
    };
  } catch (error) {
    console.error('[AXEL-APPOINTMENT] ❌ Error agendando inspección:', error);
    return {
      success: false,
      message: `Hubo un problema al agendar 😕 Por favor escríbenos directamente al 📱 +593 99 483 7117 y lo reservamos en segundos.`
    };
  }
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Convierte YYYY-MM-DD a texto legible en español (ej: "martes 3 de diciembre")
 */
function formatDateReadable(dateStr) {
  try {
    const date = new Date(`${dateStr}T12:00:00-05:00`);
    return date.toLocaleDateString('es-EC', {
      timeZone: 'America/Guayaquil',
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Convierte HH:MM (24h) a formato 12h amigable (ej: "9:00 AM")
 */
function formatTime12h(timeStr) {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}
