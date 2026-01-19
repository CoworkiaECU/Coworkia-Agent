/**
 * 🧰 Wassenger Helpers - Utilidades de normalización y validación
 * Funciones helper extraídas de wassenger.js para mejor modularidad
 */

/**
 * Convierte valor a string seguro (trim)
 */
export function safeStr(v) {
  return (typeof v === 'string' ? v : '').trim();
}

/**
 * Timestamp Unix actual (segundos)
 */
export function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Verifica si evento es mensaje entrante
 */
export function isIncomingEvent(evt) {
  return evt && evt.includes('message:in') && !evt.includes('message:out');
}

/**
 * Verifica si userId es grupo o broadcast
 */
export function isGroupOrBroadcast(userId) {
  return userId.includes('@g.us') || userId.includes('@broadcast');
}

/**
 * Extrae userId normalizado de data Wassenger
 */
export function normalizeUserId(data) {
  return safeStr(data.fromNumber || data.from || '');
}

/**
 * Extrae nombre normalizado de data Wassenger
 */
export function normalizeName(data) {
  return safeStr(data.chat?.name || data.contact?.name || data.fromName || data.name || '');
}

/**
 * Extrae texto normalizado de data Wassenger
 */
export function normalizeText(data) {
  return safeStr(data.body || data.message || '');
}

/**
 * Extrae tipo de mensaje normalizado
 */
export function normalizeType(data) {
  return safeStr(data.type || 'text') || 'text';
}

/**
 * Construye URL de media desde data Wassenger
 * Maneja tanto URLs absolutas como relativas
 */
export function buildMediaUrl(data) {
  let mediaUrl = data.mediaUrl || data.media?.url || null;

  // Wassenger a veces entrega links.download relativo
  if (!mediaUrl && data.media?.links?.download) {
    const token = process.env.WASSENGER_TOKEN;
    mediaUrl = `https://api.wassenger.com${data.media.links.download}?token=${token}`;
  }

  return mediaUrl;
}

/**
 * Construye envelope de mensaje para procesamiento interno
 */
export function buildMessageEnvelope({ userId, name, text, type, mediaUrl, data, evt }) {
  return {
    channel: 'whatsapp',
    provider: 'wassenger',
    event: evt,
    userId,
    name,
    type,
    text,
    mediaUrl,
    timestamp: data.timestamp || nowUnix(),
    raw: {
      fromMe: data.fromMe,
      isBot: data.isBot,
      mime: data.media?.mime
    }
  };
}
