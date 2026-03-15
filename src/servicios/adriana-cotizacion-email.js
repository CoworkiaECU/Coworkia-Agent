/**
 * 🛡️ ADRIANA COTIZACIÓN EMAIL SERVICE — SegPopular
 *
 * El jefe dicta desde WhatsApp el vehículo y datos del cliente:
 *   "cotización seguro Toyota RAV4 2023 $45000 para Ana Martínez
 *    ana@empresa.ec 0987654321 Quito"
 *
 * OpenAI extrae los datos estructurados.
 * Se calcula la prima anual y se genera un email HTML profesional
 * con la marca SegPopular (amarillo/azul marino).
 */

import { complete } from '../servicios-ia/openai.js';
import { generateAdrianaEmailHTML } from './generic-email-templates.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';

const SEG_ADMIN_CC = process.env.COWORKIA_ADMIN_EMAIL || 'coworkia.ec@gmail.com';
const ADMIN_WA     = (process.env.ADMIN_PHONE || '593987770788').replace('+', '');

// ─── TARIFAS (internas, no se muestran al cliente) ────────────────────────────
const INSURANCE_RATE = 0.0327;   // 3.27% sobre valor comercial
const IVA_RATE       = 0.15;     // 15% IVA Ecuador
const EMISSION_COST  = 25;       // Costo emisión
const OTHER_COSTS    = 15;       // Costos administrativos

function calculatePremium(commercialValue) {
  const base    = commercialValue * INSURANCE_RATE;
  const iva     = base * IVA_RATE;
  const annual  = Math.round(base + iva + EMISSION_COST + OTHER_COSTS);
  const monthly = Math.round(annual / 10); // 10 cuotas
  return { annual, monthly };
}

// ─── DETECCIÓN ────────────────────────────────────────────────────────────────

/**
 * Detecta si el mensaje del jefe es un comando de cotización para Adriana.
 * Requiere: keyword "cotización/coti" + email + keyword de seguro/vehículo.
 */
export function isAdrianaBossQuoteCommand(mensaje) {
  if (!mensaje) return false;
  const hasKeyword = /cotiz[ao]ci[oó]n|coti\b|manda|env[ií]a|brochure|propuesta|proforma|para\s+\w/i.test(mensaje);
  const hasEmail   = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(mensaje);
  return hasKeyword && hasEmail;
}

// ─── OPENAI: PARSEO INTELIGENTE ───────────────────────────────────────────────

async function parseDatosSeguro(mensajeJefe) {
  const systemPrompt = `Eres Adriana, asesora de SegPopular Ecuador. Recibes un mensaje del CEO con los datos de un cliente para cotizar seguro vehicular.
Extrae todos los datos disponibles y devuelve ÚNICAMENTE este JSON (sin markdown, sin texto extra):
{
  "nombre": "Ana Martínez",
  "email": "ana@empresa.ec",
  "telefono": "0987654321",
  "vehicleBrand": "TOYOTA",
  "vehicleModel": "RAV4",
  "vehicleYear": 2023,
  "commercialValue": 45000,
  "city": "Quito",
  "insuranceType": "Vehículo Liviano",
  "intro_personalizada": "párrafo de 2-3 líneas cálido y profesional dirigido al cliente, conectando su vehículo específico con la tranquilidad del seguro, tono confiable y cercano"
}

REGLAS:
- vehicleBrand y vehicleModel en MAYÚSCULAS
- vehicleYear como número
- commercialValue como número (sin $, sin comillas)
- Si no hay ciudad menciona "Ecuador"
- Si el valor no está claro, usa 40000 como default
- insuranceType: siempre "Vehículo Liviano" para autos/camionetas
- La intro_personalizada menciona el vehículo y ciudad si se conocen`;

  try {
    const raw = await complete(mensajeJefe, {
      system: systemPrompt,
      temperature: 0.3,
      max_tokens: 400,
      model: 'gpt-4o',
    });
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[ADRIANA-COTI] ❌ Error parseando JSON de OpenAI:', err.message);
    return null;
  }
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

/**
 * 🛡️ Procesa el comando del jefe y envía cotización de seguro vehicular
 * @param {string} mensajeCompleto - Texto crudo del jefe en WA
 * @param {object} [opts]
 * @param {string} [opts.quoteCode] - Código secuencial de documento
 */
export async function sendAdrianaCotizacion(mensajeCompleto, { quoteCode = '' } = {}) {
  console.log('[ADRIANA-COTI] 🛡️ Procesando cotización de seguro con OpenAI...');

  const datos = await parseDatosSeguro(mensajeCompleto);
  if (!datos || !datos.email) {
    console.error('[ADRIANA-COTI] ❌ No se pudo extraer email/datos del mensaje');
    return { success: false, error: 'No se pudo extraer email/datos del mensaje' };
  }

  console.log(`[ADRIANA-COTI] 📧 Enviando cotización → ${datos.vehicleBrand} ${datos.vehicleModel} (${datos.email})`);

  const premium  = calculatePremium(datos.commercialValue || 40000);
  const html     = generateAdrianaEmailHTML({ ...datos, quoteCode, quotedPremium: premium.annual, quotedMonthly: premium.monthly, waNumber: ADMIN_WA }, { type: 'quote' });
  const codeLabel = quoteCode ? `${quoteCode} — ` : '';
  const subject  = `Cotización 🛡️ ${codeLabel}${datos.vehicleBrand} ${datos.vehicleModel} ${datos.vehicleYear} · ${datos.nombre} | Adriana - SegPopular`;

  const result = await sendEmail({ 
    to: datos.email, 
    cc: SEG_ADMIN_CC, 
    subject, 
    html,
    from: { name: AGENT_FROM_NAMES.adriana, address: DEFAULT_FROM_EMAIL }
  });

  return {
    ...result,
    nombre:         datos.nombre,
    email:          datos.email,
    telefono:       datos.telefono || null,
    vehiculo:       `${datos.vehicleBrand} ${datos.vehicleModel} ${datos.vehicleYear}`,
    commercialValue: datos.commercialValue,
    primaAnual:     premium.annual,
    quoteCode,
  };
}
