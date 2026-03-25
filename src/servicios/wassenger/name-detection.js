/**
 * 👤 Wassenger Name Detection - Detección inteligente de nombres
 * Maneja nombres de WhatsApp Business, extracción de mensajes, y limpieza
 */

/**
 * 🧹 Limpia nombres de WhatsApp Business para extraer nombre real
 * Remueve SOLO basura técnica: emojis, keywords empresariales, números de teléfono
 * NO filtra apodos ni estilos personales - respeta la identidad elegida por el usuario
 */
export function cleanWhatsAppName(whatsappName) {
  if (!whatsappName || typeof whatsappName !== 'string') return null;
  
  let cleaned = whatsappName.trim();
  
  // Remover emojis comunes (basura visual técnica)
  cleaned = cleaned.replace(/[🏠🏢💼🔥⭐🎯💪👑🚀💯😊😎🤝🌟❤️🎉💻📱🏆☎️💀💩🖕]/g, '');
  
  // Remover texto común de WhatsApp Business (basura técnica)
  const businessKeywords = [
    'whatsapp business', 'business', 'empresa', 'company', 
    'servicio', 'service', 'oficial', 'official', '\\+593', '\\+1',
    'contacto', 'contact', 'ventas', 'sales', 'info', 'atención',
    'coworkia', 'coworking'
  ];
  
  for (const keyword of businessKeywords) {
    const regex = new RegExp(keyword, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remover números de teléfono (basura técnica)
  cleaned = cleaned.replace(/\+?\d{1,4}[\s-]?\d{6,}/g, '');
  
  // Limpiar espacios múltiples
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Solo tomar el primer nombre si es muy largo (+ de 20 caracteres es sospechoso de ser texto corporativo)
  if (cleaned.length > 20) {
    cleaned = cleaned.split(' ')[0];
  }
  
  // ✅ IMPORTANTE: NO capitalizamos - respetamos capitalización original del usuario
  // Las personas eligen cómo quieren ser escritas: "MALDITO", "Vakita", "dievil", "JJ", etc.
  
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
