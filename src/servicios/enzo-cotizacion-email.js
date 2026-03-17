/**
 * 🚀 ENZO COTIZACIÓN EMAIL SERVICE — MarketingLab
 *
 * El jefe dicta todo por WhatsApp estando con el cliente:
 *   "cotización Empresa XYZ, necesitan agente IA para ventas,
 *    cliente actual tiene 3 vendedores, dueño es Luis Paredes,
 *    email: luis@xyz.ec, tel: 0987654321"
 *
 * Enzo recibe el texto en crudo, usa OpenAI para:
 *   1. Extraer y estructurar: nombre empresa, contacto, necesidad
 *   2. Elaborar propuesta técnica + comercial ajustada a Ecuador
 *   3. Calcular precio correcto del knowledge base
 *   4. Generar párrafos de venta consultiva personalizados
 *   5. Construir email HTML vendedor, impecable
 */

import { complete } from '../servicios-ia/openai.js';
import { generateEnzoEmailHTML } from './generic-email-templates.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import { conocimientoEnzo } from '../deteccion-intenciones/enzo-knowledge.js';

const ML_ADMIN_CC  = process.env.COWORKIA_ADMIN_EMAIL || 'coworkia.ec@gmail.com';
const ADMIN_WA     = (process.env.ADMIN_PHONE || '593987770788').replace('+', '');

// ─── DETECCIÓN ────────────────────────────────────────────────────────────────

/**
 * Detecta si el mensaje del jefe es un comando de cotización para Enzo.
 * Requiere: keyword "cotización/coti" + email presente en el mensaje.
 */
export function isEnzoBossQuoteCommand(mensaje) {
  if (!mensaje) return false;
  const hasKeyword = /cotiz[ao]ci[oó]n|coti\b|manda|env[ií]a|brochure|propuesta|proforma|para\s+\w/i.test(mensaje);
  const hasEmail   = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(mensaje);
  return hasKeyword && hasEmail;
}

// ─── OPENAI: PARSEO INTELIGENTE + PROPUESTA ───────────────────────────────────

/**
 * Usa OpenAI para extraer datos estructurados del mensaje crudo del jefe
 * y generar la propuesta personalizada completa.
 */
async function procesarConOpenAI(mensajeJefe) {
  const systemPrompt = `Eres Enzo, Director de MarketingLab Ecuador. Experto en marketing digital, branding, IA aplicada a negocios y automatización.

Recibes un mensaje del CEO quien está presencialmente con un cliente potencial y te dicta todos los datos.
Tu tarea: procesar ese mensaje y devolver un JSON con la propuesta lista.

SERVICIOS MARKETINGLAB — elige el más adecuado según lo que el cliente necesita:
- Agentes IA WhatsApp: FAQ, ventas, reservas, Vision AI ($800–$5,500 USD)
- Identidad visual / Branding / Manual de marca: estilo, colores, tipografía, guías ($800–$2,000 USD)
- Marketing digital / Estrategia: ads, contenido, posicionamiento ($600–$2,500 USD)
- Automatización de procesos: flujos, CRM, integraciones ($1,200–$3,500 USD)
- Sitio web + SEO: diseño + posicionamiento ($700–$2,000 USD)
- Consultoría estratégica: análisis, roadmap, mentoring ($500–$1,500 USD)

PRECIOS — decide basándote en complejidad, tamaño de empresa y valor que genera.
Mantenimiento mensual: $120–$280/mes según complejidad (1er mes GRATIS si aplica).
Descuento por temporada: 15–25% disponible para cierre rápido.

SERVICIOS QUE OFRECEMOS (usa la categoría más adecuada):
- Agentes IA WhatsApp: $800-$5,500 USD según complejidad
- Marketing digital / Estrategia: $600-$2,500 USD
- Identidad visual / Branding / Manual de marca: $800-$2,000 USD
- Automatización de procesos: $1,200-$3,500 USD
- Sitio web + SEO: $700-$2,000 USD
- Consultoría estratégica: $500-$1,500 USD

RESPONDE ÚNICAMENTE con este JSON válido (sin markdown, sin texto extra):
{
  "empresa": "nombre empresa o 'la empresa'",
  "contacto": "nombre del contacto",
  "email": "email@dominio.com",
  "telefono": "+593... o ''",
  "sector": "sector del negocio detectado",
  "necesidad_raw": "frase exacta de lo que necesitan",
  "nivel_agente": "basico|intermedio|avanzado",
  "project_title": "título del servicio propuesto, específico (ej: 'Manual de Marca', 'Agente IA Profesional', 'Estrategia Digital 360°')",
  "project_subtitle": "subtítulo breve que describe el beneficio clave — 1 línea",
  "precio_desarrollo": 2800,
  "precio_con_descuento": 2380,
  "aplica_descuento": true,
  "porcentaje_descuento": 15,
  "razon_descuento": "Descuento por temporada",
  "mantenimiento_mensual": 180,
  "dolor_principal": "problema clave que resuelve este servicio para su negocio",
  "roi_estimado": "texto corto de ROI realista para su negocio en Ecuador",
  "casos_uso": ["caso 1 específico para su sector", "caso 2", "caso 3"],
  "deliverables": [
    "Entregable 1 — específico para lo que necesitan (no genérico)",
    "Entregable 2",
    "Entregable 3",
    "Entregable 4",
    "Entregable 5",
    "Entregable 6",
    "Garantía 15 días — si no cumple expectativas, devolvemos"
  ],
  "intro_personalizada": "párrafo de 3-4 líneas de apertura personalizada para este cliente, convincente, que conecte con su sector y necesidad específica",
  "propuesta_tecnica": "descripción técnica de qué recibirán exactamente, 4-5 líneas, detallada y vendedora",
  "cierre_emocional": "frase de cierre poderosa, 2-3 líneas, conecta con su sector"
}`;

  const raw = await complete(mensajeJefe, {
    system: systemPrompt,
    temperature: 0.4,
    max_tokens: 1400,
    model: 'gpt-4o',
  });

  try {
    // Limpiar posibles artefactos de markdown
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[ENZO-COTI] ❌ Error parseando JSON de OpenAI:', e.message, '\n→', raw.substring(0, 300));
    return null;
  }
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

/**
 * 🚀 Procesa el dictado del jefe y envía propuesta HTML al cliente
 * @param {string} mensajeCompleto - Todo el texto que escribió el jefe en WA
 */
export async function sendEnzoCotizacion(mensajeCompleto, { quoteCode = '' } = {}) {
  console.log('[ENZO-COTI] 🧠 Procesando solicitud con OpenAI...');

  // 1. OpenAI estructura y genera la propuesta (el mensaje completo del jefe es el contexto)
  const datos = await procesarConOpenAI(mensajeCompleto);

  if (!datos || !datos.email) {
    console.error('[ENZO-COTI] ❌ OpenAI no pudo extraer datos mínimos');
    return { success: false, error: 'No se pudo extraer email/datos del mensaje' };
  }

  console.log(`[ENZO-COTI] 📧 Enviando propuesta → ${datos.empresa} (${datos.email})`);

  // 2. Construir HTML con template de propuesta (precios dinámicos por proyecto)
  const html = generateEnzoEmailHTML({ ...datos, quoteCode }, { type: 'proposal' });

  const titleLabel = datos.project_title || 'Propuesta Personalizada';
  const codeLabel  = quoteCode ? `${quoteCode} — ` : '';
  const subject    = `Cotización 🚀 ${codeLabel}${titleLabel} · ${datos.empresa} | Enzo - MarketingLab`;

  // 4. Enviar
  const result = await sendEmail({
    to:      datos.email,
    cc:      ML_ADMIN_CC,
    subject,
    html,
    from:    { name: AGENT_FROM_NAMES.enzo, address: DEFAULT_FROM_EMAIL }
  });

  return {
    ...result,
    empresa:  datos.empresa,
    contacto: datos.contacto,
    email:    datos.email,
    nivel:    datos.nivel_agente,
    precio:   datos.aplica_descuento ? datos.precio_con_descuento : datos.precio_desarrollo,
    quoteCode,
  };
}
