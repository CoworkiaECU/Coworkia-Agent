/**
 * 📧 GABI COTIZACIÓN EMAIL SERVICE
 * Genera y envía propuestas HTML profesionales de GR Consulting
 * Activado por comando natural del jefe desde WhatsApp
 */

import { complete } from '../servicios-ia/openai.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import { generateGabiEmailHTML } from './generic-email-templates.js';

const GR_ADMIN_CC  = process.env.COWORKIA_ADMIN_EMAIL || 'coworkia.ec@gmail.com';
const ADMIN_WA     = (process.env.BOT_PHONE || '593994837117').replace('+', '');

// ─── ÁREAS DE SERVICIO ───────────────────────────────────────────────────────

const SERVICE_CONFIG = {
  finanzas: {
    label: 'Finanzas y Contabilidad',
    icon: '💰',
    puntos: [
      'Declaraciones de IVA y Renta ante el SRI',
      'Estados financieros y proyecciones de flujo de caja',
      'Control de gastos, presupuestos y conciliaciones bancarias',
      'Reportes gerenciales y análisis de rentabilidad',
    ],
  },
  recursosHumanos: {
    label: 'Recursos Humanos y Nómina',
    icon: '👥',
    puntos: [
      'Cálculo de nómina, décimos y fondos de reserva',
      'Contratos laborales y afiliación al IESS',
      'Liquidaciones y finiquitos conforme al Código de Trabajo',
      'Políticas internas y reglamentos empresariales',
    ],
  },
  uafe: {
    label: 'Compliance y UAFE',
    icon: '🛡️',
    puntos: [
      'Oficial de Cumplimiento Titular certificado (LOPDLAFT)',
      'Políticas KYC y debida diligencia mejorada',
      'Reportes de operaciones sospechosas (ROS/RUI)',
      'Matrices de riesgo y capacitación AML/CFT',
    ],
  },
  legal: {
    label: 'Asesoría Legal Empresarial',
    icon: '⚖️',
    puntos: [
      'Constitución de compañías y reformas estatutarias',
      'Contratos comerciales, laborales y societarios',
      'Trámites ante Registro Mercantil, SRI e IESS',
      'Derecho corporativo y acompañamiento regulatorio',
    ],
  },
};

// ─── DETECCIÓN & PARSING ─────────────────────────────────────────────────────

/**
 * Detecta si el mensaje es un comando de cotización del jefe.
 * Requiere: palabra "cotización" / "coti" + presencia de email.
 */
export function isBossQuoteCommand(mensaje) {
  if (!mensaje) return false;
  const hasKeyword = /cotiz[ao]ci[oó]n|coti\b|manda|env[ií]a|brochure|propuesta|proforma|para\s+\w/i.test(mensaje);
  const hasEmail   = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(mensaje);
  return hasKeyword && hasEmail;
}

/** Detecta el área de servicio en el texto */
function detectArea(texto) {
  const t = texto.toLowerCase();
  if (/uafe|compliance|lavado|antilavado|aml|kyc|cumplimiento/.test(t)) return 'uafe';
  if (/recursos\s*humanos|rrhh|n[oó]mina|laboral|contrat/.test(t)) return 'recursosHumanos';
  if (/legal|societario|constituc|contrato|derecho\s*corp/.test(t)) return 'legal';
  return 'finanzas';
}

/**
 * Parsea los datos del comando natural del jefe usando OpenAI.
 * Extrae nombre limpio, empresa, email, teléfono y área de servicio.
 */
export async function parseGabiQuoteData(mensaje) {
  const emailMatch = mensaje.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (!emailMatch) return null;

  try {
    const raw = await complete(mensaje, {
      system: `Eres asistente de GR Consulting. El CEO te envía un mensaje de WhatsApp con datos de un cliente para cotizar. Extrae ÚNICAMENTE este JSON (sin markdown):
{
  "nombre": "nombre completo del cliente (solo nombre, sin descripción del servicio ni empresa)",
  "empresa": "nombre de la empresa si se menciona, sino null",
  "email": "email@ejemplo.com",
  "telefono": "número de teléfono o null",
  "area": "finanzas|recursosHumanos|uafe|legal",
  "descripcionServicio": "descripción breve del servicio solicitado en máx 6 palabras"
}
REGLAS:
- nombre: solo el nombre de la persona (ej: "Fer Gavilánez"), nunca la descripción del servicio
- area: analiza el contexto → "uafe"=compliance/antilavado/LOPDLAFT, "recursosHumanos"=nómina/RRHH, "legal"=contratos/societario, "finanzas"=resto
- descripcionServicio: resumen del pedido (ej: "protección de datos LOPDLAFT")`,
      temperature: 0.1,
      max_tokens: 200,
      model: 'gpt-4o',
    });
    const data = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    return {
      nombre:              data.nombre || 'Cliente',
      empresa:             data.empresa || null,
      email:               data.email || emailMatch[0],
      telefono:            data.telefono || '',
      area:                data.area || detectArea(mensaje),
      descripcionServicio: data.descripcionServicio || null,
    };
  } catch {
    // Fallback regex si OpenAI falla
    const phoneMatch = mensaje.match(/(?:\+?593[0-9]{9}|0[0-9]{9})/);
    return {
      nombre:   'Cliente',
      empresa:  null,
      email:    emailMatch[0],
      telefono: phoneMatch ? phoneMatch[0] : '',
      area:     detectArea(mensaje),
      descripcionServicio: null,
    };
  }
}

// ─── OPENAI: TEXTO PERSONALIZADO ─────────────────────────────────────────────

async function generarOfertaTexto({ nombre, serviceConfig, mensajeJefe = '' }) {
  const contexto = mensajeJefe
    ? `\n\nContexto del asesor sobre este cliente: "${mensajeJefe.substring(0, 400)}"`
    : '';
  try {
    const resp = await complete(
      `Redacta UN párrafo persuasivo (3-4 líneas) de introducción personalizada para ${nombre} que: saluda por nombre, conecta directamente con su situación o necesidad específica si se indica, menciona cómo GR Consulting puede apoyarle en ${serviceConfig.label} en Ecuador, e invita a aprovechar 30 minutos gratuitos sin compromiso. Tono profesional y cálido. Solo el párrafo, sin firma ni encabezado.${contexto}`,
      {
        system: 'Experta en redacción de propuestas comerciales en español ecuatoriano. Respuestas breves, elegantes y personalizadas.',
        temperature: 0.7,
        max_tokens: 160,
      }
    );
    return resp || fallbackText(nombre, serviceConfig.label);
  } catch {
    return fallbackText(nombre, serviceConfig.label);
  }
}

function fallbackText(nombre, label) {
  return `Estimado/a ${nombre}, es un gusto presentarle los servicios de GR Consulting. Contamos con amplia experiencia en ${label} para empresas ecuatorianas, acompañándolas en el cumplimiento normativo y el crecimiento sostenible. Le invitamos a aprovechar nuestra sesión inicial gratuita de 30 minutos, sin ningún compromiso.`;
}



// ─── FUNCIÓN PRINCIPAL ───────────────────────────────────────────────────────

/**
 * 🚀 Genera y envía la propuesta/cotización GR Consulting
 * @param {{ nombre: string, area: string, email: string, telefono: string, descripcionServicio?: string }} datos
 */
export async function sendGabiConsultoriaEmail({ nombre, area, email, telefono, descripcionServicio = null, mensajeJefe = '', quoteCode = '' }) {
  const cfg = SERVICE_CONFIG[area] || SERVICE_CONFIG.finanzas;
  console.log(`[GABI-COTI] 📧 Preparando propuesta para ${nombre} (${cfg.label}) → ${email}`);

  const ofertaTexto = await generarOfertaTexto({ nombre, serviceConfig: cfg, mensajeJefe });
  // Usar template aprobado de generic-email-templates.js (mismo que el flujo normal de Gabi)
  const html = generateGabiEmailHTML({
    userName:        nombre,
    consultationType: cfg.label,
    company:         null,
    ruc:             null,
    email,
    phone:           telefono || null,
    description:     descripcionServicio || `Propuesta ${cfg.label} generada por Big Boss`,
    urgency:         'Normal',
    consultationCode: quoteCode,
    recipientType:   'client',
    aiAnalysis:      ofertaTexto,
  });
  const codeLabel   = quoteCode ? `${quoteCode} — ` : '';
  const serviceLabel = descripcionServicio || cfg.label;
  const subject     = `Cotización 💼 ${codeLabel}${serviceLabel} · ${nombre} | Gabi - GR Consulting`;

  const result = await sendEmail({
    to: email,
    cc: GR_ADMIN_CC,
    subject,
    html,
    from: { name: AGENT_FROM_NAMES.gabi, address: DEFAULT_FROM_EMAIL }
  });

  if (result.success) {
    console.log(`[GABI-COTI] ✅ Propuesta enviada a ${email} (${quoteCode || 'sin código'})`);
  } else {
    console.error(`[GABI-COTI] ❌ Error enviando propuesta:`, result.error);
  }

  return { ...result, nombre, areaLabel: cfg.label, email, quoteCode };
}
