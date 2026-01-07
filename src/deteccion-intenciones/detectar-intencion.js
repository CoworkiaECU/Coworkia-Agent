// Detector de intenciones: decide a qué agente activar según el mensaje del usuario.
// Reglas:
// - Aurora (por defecto): info, reservas, Hot Desk 1, cobros unitarios.
// - Aluna: membresías/planes mensuales (10, 20, oficina ejecutiva/virtual).
// - Adriana: solo con @Adriana explícito (seguros Segpopular).
// - Enzo: solo si el usuario menciona @Enzo (experto en marketing/IA/ventas).

const ALUNA_KEYWORDS = [
  'membresía', 'membresia', 'plan mensual', 'planes',
  'plan 10', 'plan10', 'plan 20', 'plan20',
  'oficina ejecutiva', 'oficina virtual', 'virtual office'
];

const AURORA_KEYWORDS = [
  'hot desk', 'day pass', 'día gratis', 'dia gratis',
  'reserva', 'reservar', 'sala', 'reunión', 'reunion',
  'pagar', 'pago', 'transferencia', 'tarjeta', 'payphone'
];

const PAYMENT_LINK_REQUEST_PATTERNS = [
  /link.*pago/,
  /enlace.*pago/,
  /dame.*link/,
  /envía.*link/,
  /envia.*link/,
  /me.*das.*link/,
  /cómo.*pago/,
  /como.*pago/,
  /donde.*pago/,
  /dónde.*pago/,
  /quiero.*pagar/,
  /necesito.*pagar/
];

const POST_EMAIL_SUPPORT_PATTERNS = [
  /recibi.*correo.*dud/,
  /recibi.*confirmacion/,
  /confirmacion.*dud/,
  /enlace.*confirmacion/,
  /link.*confirmacion/,
  /detalles.*reserva/,
  /mi\s+reserva/,
  /tengo\s+dud/,
  /dud.*reserva/,
  /info.*reserva/,
  /hora.*llegada/
];

const MODIFICACION_RESERVA_PATTERNS = [
  /cambiar.*hora/,
  /cambiar.*fecha/,
  /cambiar.*dia/,
  /cambiar.*d[ií]a/,
  /modificar.*reserva/,
  /modificar.*la/,
  /corrige.*la/,
  /corregir.*la/,
  /corrige.*para/,
  /corregir.*para/,
  /ajusta.*hora/,
  /ajustar.*hora/,
  /reprograma/,
  /reprogramar/,
  /reagenda/,
  /reagendar/,
  /mueve.*la/,
  /mover.*la/,
  /te\s+equivocaste/,
  /esta.*mal/,
  /está.*mal/,
  /no.*es.*esa.*hora/,
  /otra.*hora/,
  /error.*hora/,
  /error.*fecha/,
  /mal.*hora/,
  /mal.*fecha/
];

const CANCELACION_PATTERNS = [
  /^cancela$/,
  /^cancelar$/,
  /^cancel$/,
  /cancela.*reserva/,
  /cancelar.*reserva/,
  /ya\s+no\s+quiero/,
  /mejor\s+no/,
  /olvida/,
  /olvidalo/,
  /olv[ií]dalo/,
  /dejalo/,
  /d[eé]jalo/,
  /no\s+importa/,
  /no\s+sigo/,
  /no\s+continuo/,
  /no\s+contin[uú]o/,
  /prefiero\s+no/,
  /no\s+gracias.*ya/,
  /no.*por\s+ahora/,
  /cambio.*de\s+opinión/,
  /cambio.*de\s+opinion/,
  /cambié.*de\s+opinión/,
  /cambi[eé].*de\s+opinion/
];

/**
 * Detecta si el usuario quiere cancelar un flujo activo
 * @param {string} text - Mensaje del usuario normalizado
 * @returns {boolean} true si es una cancelación
 */
export function detectarCancelacion(text) {
  const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CANCELACION_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Detecta intención y agente apropiado
 * IMPORTANTE: Esta función solo detecta CAMBIOS EXPLÍCITOS de agente
 * El orquestador es responsable de respetar el activeAgent si no hay cambio
 * 
 * @param {string} inputRaw - Mensaje del usuario
 * @param {string} currentAgent - Agente actualmente activo (para contexto)
 * @returns {object} { agent, reason, flags }
 */
export function detectarIntencion(inputRaw = '', currentAgent = 'AURORA') {
  const text = String(inputRaw || '').toLowerCase().trim();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isPostEmailSupport = POST_EMAIL_SUPPORT_PATTERNS.some(pattern => pattern.test(normalized));
  const isModificacionReserva = MODIFICACION_RESERVA_PATTERNS.some(pattern => pattern.test(normalized));
  const isCancelacion = detectarCancelacion(normalized);
  
  // 0) Cancelación detectada - mantener agente actual pero marcar flag
  if (isCancelacion) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'user cancellation request',
      flags: { cancelacion: true }
    };
  }

  // 1) CAMBIOS EXPLÍCITOS DE AGENTE (con @código)
  // Solo estos patrones fuerzan cambio de agente
  
  if (/@enzo/.test(text)) {
    return { agent: 'ENZO', reason: 'trigger @Enzo', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ENZO' } };
  }

  if (/@adriana/.test(text)) {
    return { agent: 'ADRIANA', reason: 'trigger @Adriana', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ADRIANA' } };
  }

  if (/@ángela/.test(text) || /@angela/.test(text)) {
    return { agent: 'ANGELA', reason: 'trigger @Ángela', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ANGELA' } };
  }

  if (/@axel/.test(text)) {
    return { agent: 'AXEL', reason: 'trigger @Axel', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'AXEL' } };
  }

  if (/@vona/.test(text)) {
    return { agent: 'VONA', reason: 'trigger @Vona', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'VONA' } };
  }

  if (/@aluna/.test(text)) {
    return { agent: 'ALUNA', reason: 'trigger @Aluna', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ALUNA' } };
  }

  if (/@aurora/.test(text)) {
    return { agent: 'AURORA', reason: 'trigger @Aurora - retorno desde otro agente', flags: { returningToAurora: true } };
  }

  // 2) CONTEXTOS ESPECIALES que requieren Aurora (independiente del agente activo)
  // Solo para casos donde Aurora DEBE intervenir
  
  // 2.5) 🔄 MODIFICACIÓN DE RESERVA EXISTENTE
  if (isModificacionReserva) {
    return {
      agent: 'AURORA',
      reason: 'modification of existing reservation',
      flags: { modificacionReserva: true, postEmailSupport: true, requiresAurora: true }
    };
  }

  // 2.6) 💳 Usuario pide link de pago
  const isPaymentLinkRequest = PAYMENT_LINK_REQUEST_PATTERNS.some(pattern => pattern.test(normalized));
  if (isPaymentLinkRequest) {
    return {
      agent: 'AURORA',
      reason: 'payment link request for confirmed reservation',
      flags: { paymentLinkRequest: true, requiresAurora: true }
    };
  }

  // 2.7) Usuario llega desde enlace del correo post-confirmación
  if (isPostEmailSupport) {
    return {
      agent: 'AURORA',
      reason: 'post-email support link',
      flags: { postEmailSupport: true, requiresAurora: true }
    };
  }

  // 3) KEYWORDS que SUGIEREN agente pero NO fuerzan cambio
  // El orquestador decidirá si cambiar según activeAgent
  
  if (ALUNA_KEYWORDS.some(k => text.includes(k))) {
    return { 
      agent: 'ALUNA', 
      reason: 'keywords membresías/planes',
      flags: { suggestedAgent: 'ALUNA', isKeywordMatch: true }
    };
  }

  if (AURORA_KEYWORDS.some(k => text.includes(k))) {
    return { 
      agent: 'AURORA', 
      reason: 'keywords reservas/pagos',
      flags: { suggestedAgent: 'AURORA', isKeywordMatch: true }
    };
  }

  // 4) Fallback: NO cambiar agente, dejar que orquestador use activeAgent
  return { 
    agent: currentAgent, // Mantener agente actual
    reason: 'no explicit trigger - maintaining active agent',
    flags: { maintainingActive: true }
  };
}
