/**
 * 🔑 KEYWORDS CENTRALIZADAS - Sistema Multiagente
 * 
 * Consolidación de todas las keywords en un solo lugar.
 * Keywords sirven para SUGERENCIAS, NO para handoffs automáticos.
 * 
 * REGLA: Solo @menciones explícitas ejecutan handoffs.
 * 
 * Última actualización: 30 Ene 2026
 */

/**
 * @menciones explícitas - ÚNICA forma de handoff
 */
export const EXPLICIT_TRIGGERS = {
  AURORA: /@aurora/i,
  ALUNA: /@aluna/i,
  ADRIANA: /@adriana/i,
  ENZO: /@enzo/i,
  ANGELA: /@[áa]ngela/i,
  AXEL: /@axel/i,
  GABI: /@gabi/i,
  PAULA: /@paula/i
};

/**
 * Keywords para SUGERENCIAS (NO handoffs automáticos)
 * Cuando se detectan, el agente actual MENCIONA al especialista
 * pero NO cambia automáticamente.
 */
export const SUGGESTION_KEYWORDS = {
  // Aurora - Coworkia reservas y pagos unitarios
  AURORA: [
    'hot desk', 'day pass', 'día gratis', 'dia gratis',
    'reserva', 'reservar', 'sala', 'reunión', 'reunion',
    'pagar', 'pago', 'transferencia', 'tarjeta', 'payphone',
    'constancia', 'comprobante pago', 'link pago'
  ],

  // Aluna - Membresías y planes mensuales
  ALUNA: [
    'membresía', 'membresia', 'plan mensual', 'planes',
    'plan 10', 'plan10', 'plan 20', 'plan20',
    'oficina virtual', 'virtual office', 'sala reuniones permanente',
    'meeting room plan', 'plan coworking'
  ],

  // Adriana - Seguros (SegPopular)
  ADRIANA: [
    'seguro', 'poliza', 'póliza', 'aseguradora', 'asegurar',
    'cobertura', 'cotizacion seguro', 'cotización seguro', 
    'segpopular', 'insurance', 'seguro vehicular', 'seguro vida'
  ],

  // Enzo - Marketing e IA (MarketingLab)
  ENZO: [
    'marketing', 'publicidad', 'redes sociales', 'social media',
    'campana', 'campaña', 'estrategia digital', 'marketinglab',
    'contenido digital', 'posicionamiento', 'seo', 'sem',
    'automatizacion', 'automatización', 'inteligencia artificial',
    'ai', 'chatbot', 'growth hacking'
  ],

  // Angela - Salud (MedBeneficios)
  ANGELA: [
    'salud', 'medico', 'médico', 'doctor', 'doctora',
    'consulta medica', 'consulta médica', 'medicina',
    'bienestar', 'seguro medico', 'seguro médico',
    'atencion medica', 'atención médica', 'empresa de salud',
    'medbeneficio', 'medbeneficios', 'cita medica', 'cita médica'
  ],

  // Axel - Reparación vehicular (PaintBull)
  AXEL: [
    'choque', 'colision', 'colisión', 'rayado', 'abollado',
    'golpe carro', 'golpe auto', 'daño vehicular', 'daño auto',
    'reparar carro', 'reparar auto', 'pintura carro', 'pintura auto',
    'paintbull', 'taller', 'enderezada', 'latoneria', 'latonería'
  ],

  // Gabi - Legal y Finanzas (GR Consulting)
  GABI: [
    'legal', 'abogado', 'abogada', 'contador', 'contadora',
    'contabilidad', 'finanzas', 'impuestos', 'tributario',
    'uafe', 'compliance', 'consulta legal', 'asesoria legal',
    'asesoría legal', 'facturacion', 'facturación', 'sri'
  ],

  // Paula - Bienes Raíces (PropElite)
  // NOTA: Paula requiere property + location keywords para sugerencia
  PAULA_PROPERTY: [
    'bienes raices', 'bienes raíces', 'inmobiliaria', 
    'propiedad', 'propiedades', 'casa', 'departamento',
    'apartamento', 'villa', 'terreno', 'lote',
    'comprar casa', 'vender casa', 'busco casa',
    'busco departamento', 'inversion inmobiliaria',
    'inversión inmobiliaria', 'compra propiedad'
  ],
  
  PAULA_LOCATION: [
    'ecuador', 'quito', 'guayaquil', 'cuenca', 'cumbaya',
    'la pradera', 'republica dominicana', 'república dominicana',
    'punta cana', 'santo domingo', 'bávaro', 'cap cana'
  ]
};

/**
 * Detecta si mensaje tiene @mención explícita
 * @param {string} message - Mensaje del usuario
 * @returns {string|null} - Nombre del agente o null
 */
export function detectExplicitMention(message) {
  const text = message.toLowerCase();
  
  // Buscar primera @mención por posición en el texto
  let firstMatch = null;
  let firstPosition = Infinity;
  
  for (const [agent, regex] of Object.entries(EXPLICIT_TRIGGERS)) {
    const match = text.match(regex);
    if (match && match.index < firstPosition) {
      firstPosition = match.index;
      firstMatch = agent;
    }
  }
  
  return firstMatch;
}

/**
 * Detecta keywords que sugieren cambio de agente
 * @param {string} message - Mensaje del usuario
 * @returns {string|null} - Agente sugerido o null
 */
export function detectSuggestedAgent(message) {
  const text = message.toLowerCase();
  
  // Verificar cada agente
  for (const [agent, keywords] of Object.entries(SUGGESTION_KEYWORDS)) {
    // Skip special cases
    if (agent === 'PAULA_PROPERTY' || agent === 'PAULA_LOCATION') continue;
    
    if (keywords.some(keyword => text.includes(keyword))) {
      return agent;
    }
  }
  
  // Paula requiere property + location (opcional pero mejor)
  const hasProperty = SUGGESTION_KEYWORDS.PAULA_PROPERTY.some(k => text.includes(k));
  const hasLocation = SUGGESTION_KEYWORDS.PAULA_LOCATION.some(k => text.includes(k));
  
  if (hasProperty) {
    return 'PAULA'; // Location es opcional, property es suficiente
  }
  
  return null;
}

/**
 * Verifica si mensaje es email (no debe activar keywords)
 * @param {string} message - Mensaje del usuario
 * @returns {boolean}
 */
export function isEmailAddress(message) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(message.trim());
}

export default {
  EXPLICIT_TRIGGERS,
  SUGGESTION_KEYWORDS,
  detectExplicitMention,
  detectSuggestedAgent,
  isEmailAddress
};
