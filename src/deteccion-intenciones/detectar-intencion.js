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

// Keywords Tomi: Requiere PROPERTY keywords (obligatorio) + LOCATION opcional
const TOMI_PROPERTY_KEYWORDS = [
  'bienes raices', 'bienes raíces', 'inmobiliaria', 'propiedad', 'propiedades',
  'casa', 'departamento', 'apartamento', 'villa', 'terreno',
  'comprar casa', 'vender casa', 'busco casa', 'busco departamento',
  'inversion inmobiliaria', 'inversión inmobiliaria', 'compra propiedad',
  'ECU-001', 'ECU-002', 'DOM-001', 'DOM-002'
];

const TOMI_LOCATION_KEYWORDS = [
  'ecuador', 'quito', 'guayaquil', 'cuenca', 'cumbaya', 'la pradera',
  'republica dominicana', 'república dominicana', 'punta cana', 'santo domingo'
];

const PAYMENT_LINK_REQUEST_PATTERNS = [
  /link.*pago/,
  /enlace.*pago/,
  /dame.*link/,
  /envia.*link/,
  /envia.*link/,
  /me.*das.*link/,
  /como.*pago/,
  /como.*pago/,
  /donde.*pago/,
  /donde.*pago/,
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
  /cambiar.*dia/,
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
  /esta.*mal/,
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
  /olvidalo/,
  /dejalo/,
  /dejalo/,
  /no\s+importa/,
  /no\s+sigo/,
  /no\s+continuo/,
  /no\s+continuo/,
  /prefiero\s+no/,
  /no\s+gracias.*ya/,
  /no.*por\s+ahora/,
  /cambio.*de\s+opinion/,
  /cambio.*de\s+opinion/,
  /cambie.*de\s+opinion/,
  /cambie.*de\s+opinion/
];

// Patrones FLEXIBLES para saludos casuales - detectan el saludo aunque haya otras palabras
const CASUAL_GREETING_PATTERNS = [
  /^hola\b/,  // hola, hola aurora, hola como estas
  /^hi\b/,    // hi, hi there
  /^hello\b/, // hello, hello aurora
  /^hey\b/,   // hey, hey there
  /^buenas\b/, // buenas, buenas tardes aurora
  /^buenos\s+dias\b/,
  /^buenas\s+tardes\b/,
  /^buenas\s+noches\b/,
  /^buen\s+dia\b/,
  /^que\s+tal\b/,     // que tal, que tal como estas
  /^como\s+estas\b/,  // como estas, como estas aurora
  /^como\s+esta\b/,
  /^saludos\b/,
  /^hola\s+de\s+nuevo\b/,
  /^hola\s+otra\s+vez\b/
];

const IDENTITY_QUESTION_PATTERNS = [
  /quien\s+eres/,
  /que\s+eres/,
  /que\s+haces/,
  /que\s+sabes\s+hacer/,
  /que\s+puedes\s+hacer/,
  /dime\s+quien\s+eres/,
  /quiero\s+saber\s+quien\s+eres/,
  /quiero\s+que\s+me\s+digas\s+quien\s+eres/,
  /que\s+me\s+puedes\s+ofrecer/,
  /que\s+servicios\s+tienen/,
  /que\s+servicios\s+ofrecen/,
  /cuales\s+son\s+tus\s+servicios/,
  /que\s+es\s+coworkia/
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
 * Detecta si el mensaje es un saludo casual (hola, buenos días, etc.)
 * @param {string} text - Mensaje del usuario normalizado
 * @returns {boolean} true si es un saludo casual
 */
export function detectarSaludoCasual(text) {
  const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CASUAL_GREETING_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Detecta si el usuario está preguntando sobre la identidad/servicios de Aurora
 * @param {string} text - Mensaje del usuario normalizado
 * @returns {boolean} true si es una pregunta de identidad
 */
export function detectarPreguntaIdentidad(text) {
  const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return IDENTITY_QUESTION_PATTERNS.some(pattern => pattern.test(normalized));
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
  const isCasualGreeting = detectarSaludoCasual(normalized);
  const isIdentityQuestion = detectarPreguntaIdentidad(normalized);
  
  // 🤖 Detectar mensaje promocional de venta de agentes virtuales
  const isVirtualAgentSalesPromo = /aurora.*quiero.*saber.*qu[eé].*puede.*hacer.*agente.*virtual/i.test(text) ||
                                    /aurora.*mu[eé]strame.*que.*puedes.*hacer.*agente.*virtual/i.test(text) ||
                                    /mu[eé]strame.*agente.*virtual.*para.*mi.*empresa/i.test(text) ||
                                    /sistema.*como.*tu.*para.*mi.*empresa/i.test(text) ||
                                    /quiero.*agente.*virtual.*como.*aurora/i.test(text) ||
                                    /qu[eé].*puede.*hacer.*agente.*virtual.*como.*t[uú].*para.*mi.*empresa/i.test(text);
  
  // 0) PROMOCIÓN: Venta de sistema de agentes virtuales
  if (isVirtualAgentSalesPromo) {
    return {
      agent: 'AURORA',
      reason: 'virtual agent sales promotion - MarketingLab OneMind',
      flags: { virtualAgentSalesPromo: true, requiresAurora: true }
    };
  }
  
  // 0) Cancelación detectada - mantener agente actual pero marcar flag
  if (isCancelacion) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'user cancellation request',
      flags: { cancelacion: true }
    };
  }

  // 0.5) Saludo casual detectado - mantener agente actual pero marcar flag
  if (isCasualGreeting) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'casual greeting - no services offered',
      flags: { casualGreeting: true }
    };
  }

  // 0.6) Pregunta de identidad detectada - mantener agente actual pero marcar flag
  if (isIdentityQuestion) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'identity question - ecosystem presentation only',
      flags: { identityQuestion: true }
    };
  }

  // 1) CAMBIOS EXPLÍCITOS DE AGENTE (con @código)
  // Solo estos patrones fuerzan cambio de agente
  
  if (/@enzo/i.test(text)) {
    return { agent: 'ENZO', reason: 'trigger @Enzo', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ENZO' } };
  }

  if (/@adriana/i.test(text)) {
    return { agent: 'ADRIANA', reason: 'trigger @Adriana', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ADRIANA' } };
  }

  if (/@[áa]ngela/i.test(text)) {
    return { agent: 'ANGELA', reason: 'trigger @Ángela', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ANGELA' } };
  }

  if (/@axel/i.test(text)) {
    return { agent: 'AXEL', reason: 'trigger @Axel', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'AXEL' } };
  }

  if (/@gabi/i.test(text)) {
    return { agent: 'GABI', reason: 'trigger @Gabi', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'GABI' } };
  }

  if (/@tomi/i.test(text)) {
    return { agent: 'TOMI', reason: 'trigger @Tomi', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'TOMI' } };
  }

  if (/@aluna/i.test(text)) {
    return { agent: 'ALUNA', reason: 'trigger @Aluna', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ALUNA' } };
  }

  if (/@aurora/i.test(text)) {
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
  
  // NOTA: Tomi NO se activa por keywords, solo por @tomi (handoff explícito)
  // Aurora/orquestador responden preguntas sobre propiedades y sugieren usar @tomi
  
  // Keywords Aluna (membresías)
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
