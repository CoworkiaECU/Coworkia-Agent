/**
 * 📧 GABI COTIZACIÓN EMAIL SERVICE
 * Genera y envía propuestas HTML profesionales de GR Consulting
 * Activado por comando natural del jefe desde WhatsApp
 */

import { complete } from '../servicios-ia/openai.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import { ecosistemaTable } from './email-ecosystem.js';

const GR_ADMIN_CC  = process.env.COWORKIA_ADMIN_EMAIL || 'coworkia.ec@gmail.com';
const ADMIN_WA     = (process.env.ADMIN_PHONE || '593987770788').replace('+', '');

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

// ─── CONSTRUCCIÓN HTML ───────────────────────────────────────────────────────

function buildEmailHTML({ nombre, area, ofertaTexto, quoteCode = '' }) {
  const cfg = SERVICE_CONFIG[area] || SERVICE_CONFIG.finanzas;
  const formatDate = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const waFree   = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Hola Gabi, soy ${nombre} y quiero coordinar mis 30 minutos gratuitos de ${cfg.label}`)}`;
  const waVisita = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Hola Gabi, soy ${nombre} y quiero coordinar la visita técnica especializada`)}`;

  const puntos = cfg.puntos.map(p => `
            <li style="padding:9px 0;color:#374151;font-size:14px;line-height:1.6;border-bottom:1px solid #F3F4F6;display:flex;gap:10px;align-items:baseline;">
              <span style="color:#C9A84C;font-weight:700;flex-shrink:0;">›</span>${p}
            </li>`).join('');

  const credenciales = ['Oficial Cumplimiento UAFE ✓', 'Experta SRI & IESS ✓', 'Derecho Corporativo ✓', 'RRHH & Nómina ✓']
    .map(c => `<span style="background:white;border:1px solid #E5E7EB;color:#374151;font-size:11px;padding:5px 12px;border-radius:20px;font-weight:500;">${c}</span>`)
    .join('');

  const aliados = ecosistemaTable({
    aliados: ['enzo', 'angela', 'adriana', 'axel', 'paula', 'aurora'],
    theme: 'dark',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Propuesta GR Consulting — ${nombre}</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="max-width:640px;margin:30px auto;">

  <!-- ══ HEADER GR CONSULTING ══ -->
  <div style="background:linear-gradient(145deg,#1B3358 0%,#0D2137 55%,#14293F 100%);border-radius:20px 20px 0 0;padding:48px 40px 40px;text-align:center;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(201,168,76,0.07);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-30px;left:-25px;width:120px;height:120px;border-radius:50%;background:rgba(201,168,76,0.05);pointer-events:none;"></div>

    <!-- Ícono GR — balanza dorada -->
    <div style="margin:0 auto 20px;width:76px;height:76px;background:linear-gradient(145deg,#C9A84C,#E8C76A);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;box-shadow:0 6px 24px rgba(201,168,76,0.45);">⚖️</div>

    <div style="color:white;font-size:30px;font-weight:800;letter-spacing:-0.5px;margin-bottom:5px;">GR Consulting</div>
    <div style="color:#C9A84C;font-size:11px;font-weight:600;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:28px;">Finanzas · Legal · RRHH · Compliance</div>

    <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(201,168,76,0.35);border-radius:14px;padding:18px 26px;display:inline-block;">
      <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Propuesta Personalizada</div>
      <div style="color:white;font-size:22px;font-weight:700;">${nombre}</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px;">${formatDate}</div>
      ${quoteCode ? `<div style="color:#E8C76A;font-size:11px;font-family:monospace;letter-spacing:0.5px;margin-top:6px;background:rgba(201,168,76,0.12);border-radius:6px;padding:3px 10px;display:inline-block;">${quoteCode}</div>` : ''}
    </div>
  </div>

  <!-- ══ CUERPO ══ -->
  <div style="background:white;padding:40px 40px 10px;">

    <!-- Párrafo personalizado (OpenAI) -->
    <div style="background:#F8FAFC;border-left:4px solid #C9A84C;border-radius:0 12px 12px 0;padding:22px 26px;margin-bottom:32px;">
      <p style="color:#1E3A5F;font-size:15px;line-height:1.85;margin:0;">${ofertaTexto}</p>
    </div>

    <!-- Área de servicio -->
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <div style="background:linear-gradient(135deg,#1E3A5F,#2E5084);width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${cfg.icon}</div>
        <div>
          <div style="color:#9CA3AF;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Área de especialidad</div>
          <div style="color:#1E3A5F;font-size:18px;font-weight:700;">${cfg.label}</div>
        </div>
      </div>
      <ul style="list-style:none;margin:0;padding:4px 16px;background:#F8FAFC;border-radius:12px;">${puntos}</ul>
    </div>

    <!-- ══ ESTRELLA: 30 MIN GRATIS ══ -->
    <div style="background:linear-gradient(145deg,#1B3358 0%,#2E5084 100%);border-radius:18px;padding:34px;text-align:center;margin-bottom:24px;">
      <div style="background:rgba(201,168,76,0.18);border:1px solid rgba(201,168,76,0.45);border-radius:30px;padding:5px 18px;display:inline-block;margin-bottom:18px;">
        <span style="color:#E8C76A;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">✨ Sin costo · Sin compromiso</span>
      </div>
      <div style="color:#C9A84C;font-size:52px;font-weight:900;line-height:1;margin-bottom:6px;">30<span style="font-size:22px;font-weight:500;"> min</span></div>
      <div style="color:white;font-size:19px;font-weight:600;margin-bottom:12px;">Consultoría Gratuita</div>
      <div style="color:rgba(255,255,255,0.72);font-size:14px;line-height:1.7;margin-bottom:26px;max-width:380px;margin-left:auto;margin-right:auto;">
        Una sesión de diagnóstico inicial donde analizamos su situación,
        identificamos oportunidades y trazamos juntos el plan de acción.
      </div>
      <a href="${waFree}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C76A);color:#1B3358;padding:16px 38px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:0.3px;box-shadow:0 6px 22px rgba(201,168,76,0.5);">
        👉 Me interesa coordinar mis 30 minutos gratuitos
      </a>
    </div>

    <!-- ══ VISITA TÉCNICA $100 ══ -->
    <div style="border:2px solid #E5E7EB;border-radius:16px;padding:28px;margin-bottom:36px;position:relative;">
      <div style="position:absolute;top:20px;right:20px;background:linear-gradient(135deg,#1B3358,#0D2137);color:white;padding:8px 14px;border-radius:12px;text-align:center;">
        <div style="font-size:9px;color:#C9A84C;font-weight:700;letter-spacing:1px;text-transform:uppercase;">desde</div>
        <div style="font-size:24px;font-weight:800;line-height:1;">$100</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.55);font-weight:500;">USD</div>
      </div>

      <div style="font-size:18px;font-weight:700;color:#1E3A5F;margin-bottom:6px;padding-right:90px;">🔍 Visita Técnica Especializada</div>
      <div style="color:#9CA3AF;font-size:13px;margin-bottom:20px;">Consultoría presencial con informe profesional entregable</div>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:22px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="color:#C9A84C;font-size:16px;flex-shrink:0;margin-top:1px;">⏱</span>
          <span style="color:#374151;font-size:14px;line-height:1.55;"><strong>90 minutos de consultoría presencial</strong> en sus instalaciones o en Coworkia Business Center</span>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="color:#C9A84C;font-size:16px;flex-shrink:0;margin-top:1px;">📄</span>
          <span style="color:#374151;font-size:14px;line-height:1.55;"><strong>Informe profesional entregable</strong> con diagnóstico, hallazgos y recomendaciones accionables</span>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="color:#C9A84C;font-size:16px;flex-shrink:0;margin-top:1px;">💳</span>
          <span style="color:#374151;font-size:14px;line-height:1.55;"><strong>Pago por anticipado — $100 USD</strong> · Transferencia, tarjeta o efectivo</span>
        </div>
      </div>

      <a href="${waVisita}" style="display:inline-block;background:white;border:2px solid #1E3A5F;color:#1E3A5F;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        📅 Coordinar visita técnica →
      </a>
    </div>

    <!-- Credenciales Gabi -->
    <div style="background:#F8FAFC;border-radius:14px;padding:24px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <div style="width:50px;height:50px;background:linear-gradient(135deg,#1E3A5F,#2E5084);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">👩‍💼</div>
        <div>
          <div style="font-weight:700;color:#1E3A5F;font-size:16px;">Gabi</div>
          <div style="color:#6B7280;font-size:13px;">Especialista Senior — GR Consulting</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;">${credenciales}</div>
    </div>
  </div>

  <!-- ══ CO-BRANDING COWORKIA — WOW FACTOR ══ -->
  <div style="background:linear-gradient(180deg,#04111F 0%,#091929 100%);border-radius:0 0 20px 20px;padding:40px;text-align:center;">

    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:32px;margin-bottom:28px;">
      <div style="color:rgba(255,255,255,0.3);font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Propuesta presentada a través de</div>
      <div style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.3px;margin-bottom:4px;">Coworkia Business Center</div>
      <div style="color:#4A9EFF;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Ecosistema de Inteligencia Empresarial · Ecuador</div>
    </div>

    <div style="color:rgba(255,255,255,0.25);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Todo el ecosistema a tu servicio</div>
    <div style="margin-bottom:30px;">${aliados}</div>

    <div style="background:rgba(74,158,255,0.07);border:1px solid rgba(74,158,255,0.15);border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.75;margin:0;">
        Un solo ecosistema. Seis especialistas. Todo lo que su empresa necesita para
        <strong style="color:rgba(255,255,255,0.8);">crecer, protegerse y prosperar</strong> en Ecuador.
      </p>
    </div>

    <div style="color:rgba(255,255,255,0.18);font-size:11px;line-height:1.7;">
      Propuesta generada por <strong style="color:rgba(255,255,255,0.35);">Gabi</strong> · Asistente IA de GR Consulting<br>
      Coworkia Intelligence System · ${formatDate}
    </div>
  </div>

</div>
</body>
</html>`;
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
  const html        = buildEmailHTML({ nombre, area, ofertaTexto, quoteCode });
  const codeLabel   = quoteCode ? `${quoteCode} — ` : '';
  // Subject limpio: usa descripcionServicio si OpenAI lo extrajo, sino el área genérica
  const serviceLabel = descripcionServicio || cfg.label;
  const subject     = `Cotización 📋 ${codeLabel}${serviceLabel} · ${nombre} | Gabi - GR Consulting`;

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
