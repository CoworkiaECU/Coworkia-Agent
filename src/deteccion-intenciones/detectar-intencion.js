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

export function detectarIntencion(inputRaw = '') {
  const text = String(inputRaw || '').toLowerCase().trim();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isPostEmailSupport = POST_EMAIL_SUPPORT_PATTERNS.some(pattern => pattern.test(normalized));
  const isModificacionReserva = MODIFICACION_RESERVA_PATTERNS.some(pattern => pattern.test(normalized));
  const isCancelacion = detectarCancelacion(normalized);
  // 0) Cancelación detectada - mantener agente actual pero marcar flag
  if (isCancelacion) {
    return {
      agent: 'AURORA',
      reason: 'user cancellation request',
      flags: { cancelacion: true }
    };
  }

  // 1) Enzo explícito
  if (/@enzo/.test(text)) {
    return { agent: 'ENZO', reason: 'trigger @Enzo', flags: { agentHandoff: true, fromAgent: 'AURORA' } };
  }

  // 2) Adriana solo con @adriana explícito
  if (/@adriana/.test(text)) {
    return { agent: 'ADRIANA', reason: 'trigger @Adriana', flags: { agentHandoff: true, fromAgent: 'AURORA' } };
  }

  // 2.1) Aurora explícito - usuario retoma con Aurora
  if (/@aurora/.test(text)) {
    return { agent: 'AURORA', reason: 'trigger @Aurora - retorno desde otro agente', flags: { returningToAurora: true } };
  }

  // 2.5) Usuario quiere modificar una reserva existente
  if (isModificacionReserva) {
    return {
      agent: 'AURORA',
      reason: 'modification of existing reservation',
      flags: { modificacionReserva: true, postEmailSupport: true }
    };
  }

  // 2.5) Usuario quiere modificar una reserva existente
  if (isModificacionReserva) {
    return {
      agent: 'AURORA',
      reason: 'modification of existing reservation',
      flags: { modificacionReserva: true, postEmailSupport: true }
    };
  }

  // 2.6) Usuario llega desde el enlace del correo post-confirmación
  if (isPostEmailSupport) {
    return {
      agent: 'AURORA',
      reason: 'post-email support link',
      flags: { postEmailSupport: true }
    };
  }

  // 3) Aluna por palabras clave de planes/membresías
  if (ALUNA_KEYWORDS.some(k => text.includes(k))) {
    return { agent: 'ALUNA', reason: 'keywords membresías/planes' };
  }

  // 4) Aurora por defecto o por keywords de reservas/pagos
  if (AURORA_KEYWORDS.some(k => text.includes(k))) {
    return { agent: 'AURORA', reason: 'keywords reservas/pagos' };
  }

  // Fallback: Aurora como recepcionista
  return { agent: 'AURORA', reason: 'fallback default' };
}
