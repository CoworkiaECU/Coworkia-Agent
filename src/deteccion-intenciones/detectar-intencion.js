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

export function detectarIntencion(inputRaw = '') {
  const text = String(inputRaw || '').toLowerCase().trim();

  // 1) Enzo explícito
  if (/@enzo/.test(text)) {
    return { agent: 'ENZO', reason: 'trigger @Enzo' };
  }

  // 2) Adriana solo con @adriana explícito
  if (/@adriana/.test(text)) {
    return { agent: 'ADRIANA', reason: 'trigger @Adriana' };
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
