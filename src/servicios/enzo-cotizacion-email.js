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
const ADMIN_WA     = (process.env.BOT_PHONE || '593994837117').replace('+', '');

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

Escribe como copywriter sénior de agencia de publicidad boutique en Ecuador. Narrativo, directo, sin corporativismos. Cada frase tiene intención.

SERVICIOS MARKETINGLAB — elige el más adecuado según lo que el cliente necesita:
- Agentes IA WhatsApp: FAQ, ventas, reservas, Vision AI
- Identidad visual / Branding / Manual de marca: estilo, colores, tipografía, guías
- Marketing digital / Estrategia: ads, contenido, posicionamiento
- Automatización de procesos: flujos, CRM, integraciones
- Sitio web + SEO: diseño + posicionamiento
- Consultoría estratégica: análisis, roadmap, mentoring

PRECIO — MarketingLab es una agencia boutique en Ecuador. Nuestros precios son SIEMPRE más competitivos que agencias tradicionales ecuatorianas. Determina un precio específico (un solo número concreto, sin rangos) basándote en:
- Complejidad real del proyecto y horas estimadas
- Capacidad del cliente (micro-empresa vs PYME establecida en Ecuador)
- Valor concreto que genera para ese negocio específico
- Mantenimiento mensual solo si el servicio lo requiere (soporte continuo, actualizaciones, hosting)

RESPONDE ÚNICAMENTE con este JSON válido (sin markdown, sin texto extra):
{
  "empresa": "nombre empresa o 'la empresa'",
  "contacto": "nombre del contacto",
  "email": "email@dominio.com",
  "telefono": "+593... o ''",
  "sector": "sector del negocio detectado",
  "necesidad_raw": "frase exacta de lo que necesitan",
  "project_title": "título del servicio propuesto, específico (ej: 'Manual de Marca', 'Agente IA Profesional', 'Estrategia Digital 360°')",
  "project_subtitle": "subtítulo breve que describe el beneficio clave — 1 línea",
  "precio_desarrollo": 1800,
  "mantenimiento_mensual": 150,
  "dolor_principal": "problema clave que resuelve este servicio para su negocio",
  "roi_estimado": "texto corto de ROI realista para su negocio en Ecuador — incluir al menos 2 números concretos (ej: 'Reducción del 60% en tiempo de respuesta + 3x más leads capturados')",
  "caso_exito": {
    "sector": "sector similar al del cliente (ej: 'Restaurante en Quito' o 'Lavandería en Guayaquil')",
    "resultado": "resultado concreto con números reales o realistas (ej: 'Pasó de 15 a 47 reservas/semana en 60 días')",
    "servicio": "qué servicio de MarketingLab usaron (ej: 'Agente WhatsApp + Google Ads local')"
  },
  "urgencia": "razón sutil y real de por qué actuar ahora — no spam, debe ser creíble (ej: 'Precio introductorio válido hasta fin de mes' o 'Solo tomamos 3 proyectos nuevos al mes para mantener la calidad')",
  "casos_uso": ["caso 1 específico para su sector", "caso 2", "caso 3"],
  "deliverables": [
    "Entregable 1 — específico para lo que necesitan (no genérico)",
    "Entregable 2",
    "Entregable 3",
    "Entregable 4",
    "Entregable 5"
  ],
  "titular": "frase de apertura de golpe — máximo 2 líneas, sin comillas, copywriter senior, específica para este cliente y sector (ej: WELLFEST no necesita un logo. Necesita una razón para que la gente vuelva.)",
  "diagnostico": "párrafo narrativo de 2-3 frases para sección diagnóstico — qué está pasando sin este servicio, qué consecuencia concreta tiene para este negocio en Ecuador, tono directo y específico",
  "intro_personalizada": "párrafo de 3-4 líneas de apertura personalizada para este cliente, convincente, que conecte con su sector y necesidad específica",
  "propuesta_tecnica": "descripción narrativa de qué recibirán exactamente y por qué importa, 3-4 líneas, vendedora pero sin tecnicismos",
  "cierre_emocional": "frase de cierre poderosa, 2-3 líneas, conecta con su sector"
}`;

  const raw = await complete(mensajeJefe, {
    system: systemPrompt,
    temperature: 0.4,
    max_tokens: 2200,
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
 * que se inyecta en el template único de Enzo (generateEnzoEmailHTML).
 * Diseño: 3 actos — diagnóstico → construcción → inversión + CTA.
 */
function _renderBossQuoteBriefHTML(d, quoteCode = '') {
  const precio = d.precio_desarrollo || 0;
  const mitad  = Math.round(precio / 2);

  const ctaText = encodeURIComponent(
    `@enzo quiero arrancar con ${d.project_title || 'el proyecto'}${quoteCode ? ` (${quoteCode})` : ''}`
  );
  const waLink = `https://wa.me/${ADMIN_WA}?text=${ctaText}`;

  const defaultDeliverables = [
    'Desarrollo personalizado para su negocio',
    'Documentación de entrega',
    'Revisiones incluidas',
  ];

  const deliverableItems = (d.deliverables || defaultDeliverables)
    .map(item => {
      const sep  = item.indexOf(' — ');
      const name = sep > -1 ? item.slice(0, sep) : item;
      const why  = sep > -1 ? item.slice(sep + 3) : '';
      return `<div style="font-size:13px;color:#1E293B;padding:8px 0;border-bottom:1px solid #F1F5F9;line-height:1.55;"><span style="color:#2DD4BF;font-weight:800;margin-right:10px;">✓</span><strong>${name}</strong>${why ? ` — <span style="color:#6B7280;">${why}</span>` : ''}</div>`;
    })
    .join('');

  // Fallback para backward-compat si llega request sin titular/diagnostico
  const titular    = d.titular    || `${d.empresa} merece una estrategia diseñada a su medida.`;
  const diagnostico = d.diagnostico || d.intro_personalizada || '';

  return `
    <!-- TITULAR -->
    <div style="margin-bottom:32px;">
      <p style="font-size:22px;font-weight:800;color:#0A0F1E;line-height:1.3;margin:0 0 16px;">&ldquo;${titular}&rdquo;</p>
      <p style="font-size:14px;color:#6B7280;line-height:1.8;margin:0;">${d.intro_personalizada || ''}</p>
    </div>

    <div style="height:1px;background:linear-gradient(90deg,#E5E7EB,transparent);margin-bottom:32px;"></div>

    <!-- 01 El problema real -->
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:28px;height:28px;background:#0A0F1E;border-radius:7px;font-size:10px;font-weight:800;color:#2DD4BF;display:flex;align-items:center;justify-content:center;flex-shrink:0;">01</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;color:#9CA3AF;text-transform:uppercase;">El problema real</div>
      </div>
      <p style="font-size:14px;line-height:1.85;color:#374151;margin:0 0 14px;">${diagnostico}</p>
      <div style="background:#FFF7ED;border-left:3px solid #F59E0B;border-radius:0 10px 10px 0;padding:14px 18px;">
        <p style="font-size:13px;color:#92400E;line-height:1.7;margin:0;font-weight:500;">${d.dolor_principal || ''}</p>
      </div>
      ${d.caso_exito ? `
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 18px;margin-top:16px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#16A34A;text-transform:uppercase;margin-bottom:8px;">Caso similar — ${d.caso_exito.sector || 'sector relacionado'}</div>
        <p style="font-size:13px;color:#166534;line-height:1.7;margin:0;font-weight:600;">${d.caso_exito.resultado || ''}</p>
        ${d.caso_exito.servicio ? `<p style="font-size:11px;color:#6B7280;margin:6px 0 0;line-height:1.5;">Servicio: ${d.caso_exito.servicio}</p>` : ''}
      </div>` : ''}
    </div>

    <div style="height:1px;background:linear-gradient(90deg,#E5E7EB,transparent);margin-bottom:32px;"></div>

    <!-- 02 Lo que construimos -->
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:28px;height:28px;background:#0A0F1E;border-radius:7px;font-size:10px;font-weight:800;color:#2DD4BF;display:flex;align-items:center;justify-content:center;flex-shrink:0;">02</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;color:#9CA3AF;text-transform:uppercase;">Lo que construimos</div>
      </div>
      <p style="font-size:14px;line-height:1.85;color:#374151;margin:0 0 20px;">${d.propuesta_tecnica || ''}</p>
      <div style="border:1.5px solid #E5E7EB;border-radius:12px;padding:20px 22px;margin-bottom:18px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#9CA3AF;text-transform:uppercase;margin-bottom:14px;">Todo lo que incluye</div>
        ${deliverableItems}
      </div>
      ${d.roi_estimado ? `<div style="background-color:#050B15;background:linear-gradient(135deg,#050B15,#0D1B2A);border-radius:12px;padding:22px 24px;"><div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#2DD4BF;text-transform:uppercase;margin-bottom:10px;">Qué cambia el día que entregamos esto</div><p style="font-size:13px;color:rgba(255,255,255,0.78);line-height:1.85;margin:0;">${d.roi_estimado}</p></div>` : ''}
    </div>

    <div style="height:1px;background:linear-gradient(90deg,#E5E7EB,transparent);margin-bottom:32px;"></div>

    <!-- 03 La inversión -->
    <div style="margin-bottom:40px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <div style="width:28px;height:28px;background:#0A0F1E;border-radius:7px;font-size:10px;font-weight:800;color:#2DD4BF;display:flex;align-items:center;justify-content:center;flex-shrink:0;">03</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;color:#9CA3AF;text-transform:uppercase;">La inversión</div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:6px;line-height:1;">
        <span style="font-size:56px;font-weight:900;color:#0A0F1E;letter-spacing:-2px;">$${precio.toLocaleString()}</span>
        <span style="font-size:15px;color:#9CA3AF;padding-bottom:12px;">USD</span>
      </div>
      ${d.mantenimiento_mensual ? `<div style="font-size:13px;color:#6B7280;margin-bottom:14px;">+ $${d.mantenimiento_mensual} / mes mantenimiento</div>` : ''}
      <div style="background:#F8FAFC;border-radius:9px;padding:12px 18px;font-size:13px;color:#374151;line-height:2;margin-bottom:12px;">
        50% al arrancar → <strong style="color:#0A0F1E;">$${mitad.toLocaleString()} USD</strong><br>
        50% al entregar → <strong style="color:#0A0F1E;">$${mitad.toLocaleString()} USD</strong>
      </div>
      <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.6;">Incluye 2 rondas de revisiones.</p>
    </div>

    <!-- CTA -->
    <div style="background-color:#ECFDF9;background:linear-gradient(135deg,#ECFDF9,#F0FDFA);border:1.5px solid rgba(45,212,191,0.3);border-radius:14px;padding:28px;text-align:center;margin-bottom:4px;">
      ${d.cierre_emocional ? `<p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px;font-style:italic;">${d.cierre_emocional}</p>` : ''}
      <p style="font-size:15px;font-weight:700;color:#0A0F1E;margin:0 0 6px;">¿Le damos luz verde a ${d.empresa}?</p>
      <p style="font-size:13px;color:#6B7280;margin:0 0 22px;line-height:1.6;">${d.contacto ? `${d.contacto}, arrancar` : 'Arrancar'} es una conversación de 15 minutos.<br>Escríbame ahora y lo coordinamos hoy mismo.</p>
      <a href="${waLink}" style="display:inline-block;background-color:#059669;background:linear-gradient(135deg,#059669,#2DD4BF);color:white;font-size:15px;font-weight:800;padding:16px 42px;border-radius:50px;text-decoration:none;box-shadow:0 6px 22px rgba(13,148,136,0.4);letter-spacing:0.3px;">Arrancar con ${d.empresa} →</a>
      ${d.urgencia ? `<p style="font-size:12px;color:#D97706;font-weight:600;margin:14px 0 0;line-height:1.5;">⚡ ${d.urgencia}</p>` : ''}
      <p style="font-size:11px;color:#9CA3AF;margin:10px 0 0;">Respondo en menos de 2 horas · Lunes a sábado · Sin compromiso</p>
    </div>
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
  const briefHTML = _renderBossQuoteBriefHTML(datos, quoteCode);

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
    empresa:   datos.empresa,
    contacto:  datos.contacto,
    email:     datos.email,
    telefono:  datos.telefono || '',
    precio:    datos.precio_desarrollo,
    nivel:     datos.project_title || null,
    quoteCode,
  };
}
