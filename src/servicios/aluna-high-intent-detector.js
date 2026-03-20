/**
 * 🎯 Aluna High Intent Detection
 * 
 * Detecta cuando un prospecto muestra señales de alto interés/urgencia
 * (preguntas sobre precios exactos, disponibilidad, horarios, etc.)
 * 
 * Acción: Cambiar status a 'negotiating' + notificar Diego para seguimiento humano
 * 
 * @author Aurora Core
 * @date 2026-03-20
 */

/**
 * Keywords que indican alto interés comercial
 * Agrupadas por categoría para debugging y análisis
 */
const HIGH_INTENT_KEYWORDS = {
  pricing: [
    'precio exacto',
    'cuánto cuesta',
    'cuanto cuesta',
    'cuál es el precio',
    'cual es el precio',
    'valor exacto',
    'costo',
    'precio final',
    'cuánto sale',
    'cuanto sale',
    'precio total',
  ],
  availability: [
    'cuando puedo ver',
    'cuándo puedo ver',
    'cuando puedo visitar',
    'cuándo puedo visitar',
    'disponibilidad',
    'horarios',
    'está disponible',
    'esta disponible',
    'puedo ir',
    'puedo ver',
    'agendar visita',
    'coordinar visita',
  ],
  commitment: [
    'me interesa',
    'estoy interesado',
    'estoy interesada',
    'quiero contratar',
    'quiero tomar',
    'quiero el plan',
    'me gustaría contratar',
    'me gustaria contratar',
    'cómo contrato',
    'como contrato',
    'quiero empezar',
    'cuando empiezo',
    'cuándo empiezo',
  ],
  urgency: [
    'urgente',
    'pronto',
    'rápido',
    'rapido',
    'ya',
    'hoy',
    'esta semana',
    'lo antes posible',
    'necesito ya',
  ],
};

/**
 * Detecta si un mensaje contiene keywords de alto interés
 * @param {string} message - Mensaje del prospecto
 * @returns {{ detected: boolean, category: string|null, keyword: string|null }}
 */
export function detectHighIntentKeywords(message) {
  if (!message || typeof message !== 'string') {
    return { detected: false, category: null, keyword: null };
  }

  const normalized = message.toLowerCase().trim();

  // Revisar cada categoría
  for (const [category, keywords] of Object.entries(HIGH_INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return {
          detected: true,
          category,
          keyword,
        };
      }
    }
  }

  return { detected: false, category: null, keyword: null };
}

/**
 * Genera mensaje de notificación para Diego cuando se detecta high intent
 * @param {object} prospect - Datos del prospecto
 * @param {object} detection - Resultado de detectHighIntentKeywords()
 * @param {string} originalMessage - Mensaje original del prospecto
 * @returns {string} Mensaje formateado para WhatsApp
 */
export function buildHighIntentNotification(prospect, detection, originalMessage) {
  const { user_phone, user_name, membership_type, membership_code } = prospect;
  const { category, keyword } = detection;

  const categoryEmojis = {
    pricing: '💰',
    availability: '📅',
    commitment: '🤝',
    urgency: '🔥',
  };

  const categoryNames = {
    pricing: 'Consulta de precio',
    availability: 'Disponibilidad/visita',
    commitment: 'Compromiso de compra',
    urgency: 'Urgencia alta',
  };

  const emoji = categoryEmojis[category] || '🎯';
  const catName = categoryNames[category] || 'High intent';

  return `🚨 *ALUNA — ${emoji} ${catName.toUpperCase()}*

*Prospecto:* ${user_name || 'Sin nombre'}
*Teléfono:* ${user_phone}
*Plan:* ${membership_type || 'No especificado'}
${membership_code ? `*Código:* ${membership_code}` : ''}

*Keyword detectada:* "_${keyword}_"

*Mensaje original:*
"${originalMessage.substring(0, 160)}${originalMessage.length > 160 ? '...' : ''}"

✅ *Status cambiado a:* NEGOTIATING
⚡ *Acción requerida:* Seguimiento humano prioritario

---
Dashboard: ${process.env.HEROKU_APP_NAME ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com` : 'localhost:3000'}/aluna-proformas.html`;
}

/**
 * Keywords por categoría (para testing/debugging)
 */
export function getKeywordsByCategory(category) {
  return HIGH_INTENT_KEYWORDS[category] || [];
}

/**
 * Todas las categorías disponibles
 */
export function getAllCategories() {
  return Object.keys(HIGH_INTENT_KEYWORDS);
}
