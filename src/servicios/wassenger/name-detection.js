/**
 * 👤 Wassenger Name Detection - Detección inteligente de nombres
 * Maneja nombres de WhatsApp Business, extracción de mensajes, y limpieza
 */

/**
 * 🧹 Limpia nombres de WhatsApp Business para extraer nombre real
 * Remueve emojis, keywords empresariales, números de teléfono
 */
export function cleanWhatsAppName(whatsappName) {
  if (!whatsappName || typeof whatsappName !== 'string') return null;
  
  let cleaned = whatsappName.trim();
  
  // Remover emojis comunes
  cleaned = cleaned.replace(/[🏠🏢💼🔥⭐🎯💪👑🚀💯😊😎🤝🌟❤️🎉💻📱🏆☎️]/g, '');
  
  // Remover texto común de WhatsApp Business
  const businessKeywords = [
    'whatsapp business', 'business', 'empresa', 'company', 
    'servicio', 'service', 'oficial', 'official', '\\+593', '\\+1',
    'contacto', 'contact', 'ventas', 'sales', 'info', 'atención'
  ];
  
  for (const keyword of businessKeywords) {
    const regex = new RegExp(keyword, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remover números de teléfono
  cleaned = cleaned.replace(/\+?\d{1,4}[\s-]?\d{6,}/g, '');
  
  // Limpiar espacios y caracteres especiales (mantener acentos españoles)
  cleaned = cleaned.replace(/[^\w\sñáéíóúüÑÁÉÍÓÚÜ]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Solo tomar el primer nombre si es muy largo
  if (cleaned.length > 20) {
    cleaned = cleaned.split(' ')[0];
  }
  
  // Capitalizar cada palabra (Title Case)
  if (cleaned.length > 0) {
    cleaned = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return cleaned.length > 1 ? cleaned : null;
}

/**
 * 🔍 Detecta nombre desde mensaje de presentación
 */
export function extractNameFromMessage(message) {
  if (!message) return null;
  
  // Patrones comunes de presentación
  const patterns = [
    /(?:soy|me llamo|mi nombre es|soy de)\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i,
    /(?:hola|buenos días|buenas tardes|buenas noches),?\s*(?:soy)?\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1].length > 1) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  
  return null;
}

/**
 * 🎯 Detecta nombre inteligente con prioridades:
 * 1. Nombre de WhatsApp actual (limpio)
 * 2. Nombre guardado en BD
 * 3. Extraído del mensaje de presentación
 */
export function detectSmartName({ whatsappName, savedName, message, isFirstVisit }) {
  // 1️⃣ PRIORIDAD: Si llega nombre de WhatsApp, SIEMPRE usarlo
  if (whatsappName) {
    const cleaned = cleanWhatsAppName(whatsappName);
    if (cleaned) return cleaned;
  }
  
  // 2️⃣ FALLBACK: Usar nombre guardado en BD
  if (savedName) {
    return savedName;
  }
  
  // 3️⃣ ÚLTIMO RECURSO: Intentar extraer del mensaje (solo primera visita)
  if (isFirstVisit && message) {
    const extracted = extractNameFromMessage(message);
    if (extracted) return extracted;
  }
  
  // Sin nombre detectado
  return null;
}
