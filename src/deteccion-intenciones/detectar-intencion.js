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
  /hora.*llegada/,
  /cambiar.*hora/,
  /modificar.*reserva/
];

export function detectarIntencion(inputRaw = '') {
  const text = String(inputRaw || '').toLowerCase().trim();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isPostEmailSupport = POST_EMAIL_SUPPORT_PATTERNS.some(pattern => pattern.test(normalized));

  // 1) Enzo explícito
  if (/@enzo/.test(text)) {
    return { agent: 'ENZO', reason: 'trigger @Enzo' };
  }

  // 2) Adriana solo con @adriana explícito
  if (/@adriana/.test(text)) {
    return { agent: 'ADRIANA', reason: 'trigger @Adriana' };
  }

  // 2.5) Usuario llega desde el enlace del correo post-confirmación
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
