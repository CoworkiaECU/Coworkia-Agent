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

// ─── BRIEF HTML PARA EL TEMPLATE ÚNICO ───────────────────────────────────────

/**
 * Convierte los datos enriquecidos por OpenAI en el bloque briefHTML
 * que se inyecta en el template único de Enzo (generateEnzoEmailHTML confirmation).
 * Incluye: sector/necesidad, intro, solución+deliverables, casos, ROI, precio, cierre.
 */
function _renderBossQuoteBriefHTML(d) {
  const precioFinal  = d.aplica_descuento ? d.precio_con_descuento : d.precio_desarrollo;
  const precioBase   = d.precio_desarrollo;
  const ahorro       = precioBase - precioFinal;

  const defaultDeliverables = [
    'Desarrollo personalizado para su negocio',
    'Documentación de entrega',
    'Revisiones incluidas',
    'Garantía 15 días — si no cumple expectativas, devolvemos',
  ];

  const deliverableItems = (d.deliverables || defaultDeliverables)
    .map(item => `
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:14px;color:#374151;line-height:1.5;align-items:baseline;">
        <span style="color:#0D9488;font-weight:700;flex-shrink:0;">✓</span>${item}
      </div>`)
    .join('');

  const casosItems = (d.casos_uso || [])
    .map((c, i) => `
      <div style="display:flex;gap:12px;padding:10px 0;${i > 0 ? 'border-top:1px solid #F3F4F6;' : ''}">
        <div style="width:26px;height:26px;background:linear-gradient(135deg,#0D9488,#2DD4BF);border-radius:7px;flex-shrink:0;font-size:12px;font-weight:800;color:white;display:flex;align-items:center;justify-content:center;">${i + 1}</div>
        <div style="font-size:13px;color:#374151;line-height:1.6;padding-top:3px;">${c}</div>
      </div>`)
    .join('');

  return `
    <!-- Sector + Necesidad -->
    <div style="display:flex;gap:12px;margin:0 0 20px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;background:#F8FAFC;border-radius:10px;padding:14px;text-align:center;">
        <div style="color:#9CA3AF;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">Sector</div>
        <div style="color:#1E293B;font-size:13px;font-weight:700;">${d.sector || '—'}</div>
      </div>
      <div style="flex:2;min-width:180px;background:#F8FAFC;border-radius:10px;padding:14px;">
        <div style="color:#9CA3AF;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">Necesidad identificada</div>
        <div style="color:#1E293B;font-size:13px;font-weight:600;line-height:1.4;">${d.necesidad_raw || '—'}</div>
      </div>
    </div>

    <!-- Intro personalizada -->
    <div style="background:#F0FDFB;border-left:4px solid #2DD4BF;border-radius:0 10px 10px 0;padding:18px 22px;margin-bottom:20px;">
      <p style="color:#0D3B2E;font-size:14px;line-height:1.8;margin:0;">${d.intro_personalizada || ''}</p>
    </div>

    <!-- Solución + deliverables -->
    <div style="border:2px solid #E2E8F0;border-radius:14px;padding:22px;margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">Solución diseñada para ${d.empresa}</div>
      <div style="color:#0D1B2A;font-size:18px;font-weight:800;margin-bottom:12px;">${d.project_title || 'Propuesta Personalizada'}</div>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">${d.propuesta_tecnica || ''}</p>
      ${deliverableItems}
    </div>

    ${casosItems ? `
    <!-- Casos de uso -->
    <div style="margin-bottom:20px;">
      <div style="color:#9CA3AF;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Cómo se aplica en ${d.empresa}</div>
      <div style="background:#F8FAFC;border-radius:12px;padding:6px 16px;">${casosItems}</div>
    </div>` : ''}

    ${d.roi_estimado ? `
    <!-- ROI -->
    <div style="background:#F0FDFB;border:1px solid rgba(13,148,136,0.2);border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <div style="color:#0D9488;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Retorno estimado</div>
      <div style="color:#0D3B2E;font-size:13px;line-height:1.7;">${d.roi_estimado}</div>
    </div>` : ''}

    <!-- Inversión -->
    <div style="border:2px solid #E2E8F0;border-radius:14px;padding:22px;margin-bottom:20px;">
      <div style="color:#9CA3AF;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Inversión</div>
      ${d.aplica_descuento ? `
      <div style="color:#9CA3AF;font-size:12px;text-decoration:line-through;margin-bottom:4px;">Precio regular: $${precioBase.toLocaleString()} USD</div>
      <div style="background:#ECFDF5;border:1px solid #6EE7B7;border-radius:7px;padding:3px 12px;display:inline-block;margin-bottom:8px;">
        <span style="color:#065F46;font-size:12px;font-weight:700;">🎁 ${d.razon_descuento || 'Descuento'} ${d.porcentaje_descuento || 15}% = -$${ahorro.toLocaleString()}</span>
      </div>` : ''}
      <div style="margin-bottom:6px;">
        <span style="color:#0D1B2A;font-size:34px;font-weight:900;">${precioFinal.toLocaleString()}</span>
        <span style="color:#6B7280;font-size:13px;"> USD</span>
      </div>
      ${d.mantenimiento_mensual ? `<div style="color:#6B7280;font-size:12px;margin-bottom:14px;">+ $${d.mantenimiento_mensual}/mes mantenimiento · <span style="color:#0D9488;font-weight:600;">1er mes GRATIS ✓</span></div>` : ''}
      <div style="background:#F8FAFC;border-radius:9px;padding:12px 16px;font-size:13px;color:#374151;line-height:1.8;">
        50% inicio → <strong>$${Math.round(precioFinal / 2).toLocaleString()} USD</strong><br>
        50% entrega → <strong>$${Math.round(precioFinal / 2).toLocaleString()} USD</strong>
      </div>
      <div style="background:#FEF9EC;border:1px solid #FCD34D;border-radius:7px;padding:10px 14px;margin-top:12px;font-size:12px;color:#92400E;">
        ⏰ Oferta válida 30 días · ⚡ Tiempo: 3–4 semanas · 🛡️ Garantía 15 días
      </div>
    </div>

    ${d.cierre_emocional ? `
    <!-- Cierre -->
    <div style="background:linear-gradient(135deg,#0A0F1E 0%,#0D1A2B 100%);border-left:3px solid #2DD4BF;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:20px;">
      <p style="color:rgba(255,255,255,0.85);font-size:13px;line-height:1.7;margin:0;">${d.cierre_emocional}</p>
    </div>` : ''}
  `;
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

/**
 * 🚀 Procesa el dictado del jefe y envía propuesta HTML al cliente.
 * Usa el ÚNICO template de Enzo (generateEnzoEmailHTML confirmation)
 * inyectando briefHTML generado desde los datos de OpenAI.
 */
export async function sendEnzoCotizacion(mensajeCompleto, { quoteCode = '' } = {}) {
  console.log('[ENZO-COTI] 🧠 Procesando solicitud con OpenAI...');

  const datos = await procesarConOpenAI(mensajeCompleto);

  if (!datos || !datos.email) {
    console.error('[ENZO-COTI] ❌ OpenAI no pudo extraer datos mínimos');
    return { success: false, error: 'No se pudo extraer email/datos del mensaje' };
  }

  console.log(`[ENZO-COTI] 📧 Enviando propuesta → ${datos.empresa} (${datos.email})`);

  // Generar briefHTML desde datos OpenAI e inyectar en el template único
  const briefHTML = _renderBossQuoteBriefHTML(datos);

  const html = generateEnzoEmailHTML({
    userName:    datos.contacto || datos.empresa,
    projectType: datos.project_title || 'Propuesta Personalizada',
    companyName: datos.empresa,
    email:       datos.email,
    phone:       datos.telefono || '',
    leadId:      quoteCode,
    briefHTML,
  }, { type: 'confirmation' });

  const titleLabel = datos.project_title || 'Propuesta Personalizada';
  const codeLabel  = quoteCode ? `${quoteCode} — ` : '';
  const subject    = `Cotización 🚀 ${codeLabel}${titleLabel} · ${datos.empresa} | Enzo - MarketingLab`;

  const result = await sendEmail({
    to:   datos.email,
    cc:   ML_ADMIN_CC,
    subject,
    html,
    from: { name: AGENT_FROM_NAMES.enzo, address: DEFAULT_FROM_EMAIL },
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
