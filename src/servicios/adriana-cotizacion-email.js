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
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import { ecosistemaTable } from './email-ecosystem.js';
import { LOGOS_BASE64 } from './email-assets.js';

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

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildAdrianaEmailHTML(d) {
  const fechaFmt = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const premium = calculatePremium(d.commercialValue || 40000);
  const vehicleLabel = `${d.vehicleBrand} ${d.vehicleModel} ${d.vehicleYear}`;
  const waLink = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(
    `Hola Adriana! Soy ${d.nombre}. Recibí la cotización de seguro para mi ${vehicleLabel} (${d.quoteCode}). Me interesa proceder.`
  )}`;

  const ecosistemaItems = ecosistemaTable({
    aliados: ['enzo', 'gabi', 'angela', 'axel', 'paula', 'aurora'],
    theme: 'dark',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Cotización Seguro — ${vehicleLabel}</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="max-width:640px;margin:30px auto;">

  <!-- ══ HEADER SEGPOPULAR ══ -->
  <div style="background:#FFD700;border-radius:20px 20px 0 0;padding:44px 40px 38px;text-align:center;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(30,58,138,0.06);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-30px;left:-30px;width:130px;height:130px;border-radius:50%;background:rgba(30,58,138,0.04);pointer-events:none;"></div>

    <div style="margin-bottom:22px;">
      <img src="data:image/png;base64,${LOGOS_BASE64.segpopular}"
           alt="SegPopular"
           style="max-width:240px;height:auto;display:block;margin:0 auto;" />
    </div>
    <div style="color:#1E3A8A;font-size:11px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:26px;">Seguros Vehiculares · Ecuador</div>

    <div style="background:white;border:2px solid #1E3A8A;border-radius:14px;padding:20px 28px;display:inline-block;box-shadow:0 4px 16px rgba(30,58,138,0.2);">
      <div style="color:#1E3A8A;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:7px;">Cotización para</div>
      <div style="color:#1E3A8A;font-size:22px;font-weight:800;margin-bottom:3px;">${d.nombre}</div>
      <div style="color:#6B7280;font-size:12px;margin-bottom:6px;">${fechaFmt}</div>
      ${d.quoteCode ? `<div style="color:#1E3A8A;font-size:11px;font-family:monospace;font-weight:700;background:#FFF9C4;border-radius:5px;padding:3px 10px;display:inline-block;">${d.quoteCode}</div>` : ''}
    </div>
  </div>

  <!-- ══ CUERPO ══ -->
  <div style="background:white;padding:40px 40px 12px;">

    <!-- Intro personalizada (OpenAI) -->
    <div style="background:#FFFBEB;border-left:4px solid #FFD700;border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:30px;">
      <p style="color:#1E3A8A;font-size:15px;line-height:1.85;margin:0;">${d.intro_personalizada}</p>
    </div>

    <!-- Ficha del Vehículo -->
    <div style="border:2px solid #E5E7EB;border-radius:16px;overflow:hidden;margin-bottom:26px;">
      <div style="background:#1E3A8A;padding:18px 24px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:28px;">🚗</div>
        <div>
          <div style="color:#FFD700;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Vehículo asegurado</div>
          <div style="color:white;font-size:18px;font-weight:800;">${vehicleLabel}</div>
        </div>
      </div>
      <div style="padding:20px 24px;background:#FAFAFA;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:9px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6;width:45%;">Marca</td>
            <td style="padding:9px 0;color:#1E3A8A;font-size:13px;font-weight:700;border-bottom:1px solid #F3F4F6;">${d.vehicleBrand}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6;">Modelo</td>
            <td style="padding:9px 0;color:#1E3A8A;font-size:13px;font-weight:700;border-bottom:1px solid #F3F4F6;">${d.vehicleModel}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6;">Año</td>
            <td style="padding:9px 0;color:#1E3A8A;font-size:13px;font-weight:700;border-bottom:1px solid #F3F4F6;">${d.vehicleYear}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6;">Valor comercial</td>
            <td style="padding:9px 0;color:#1E3A8A;font-size:13px;font-weight:700;border-bottom:1px solid #F3F4F6;">$${(d.commercialValue || 0).toLocaleString()} USD</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#6B7280;font-size:13px;">Ciudad</td>
            <td style="padding:9px 0;color:#1E3A8A;font-size:13px;font-weight:700;">${d.city}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ══ PRIMA ══ -->
    <div style="background:linear-gradient(145deg,#1E3A8A 0%,#1D4ED8 100%);border-radius:18px;padding:32px;text-align:center;margin-bottom:26px;">
      <div style="color:#FFD700;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">Tu cotización anual</div>
      <div style="color:white;font-size:46px;font-weight:900;line-height:1;margin-bottom:6px;">$${premium.annual.toLocaleString()}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:22px;">USD incluye IVA · Seguro ${d.insuranceType}</div>
      <div style="background:rgba(255,215,0,0.12);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:14px;display:inline-block;margin-bottom:20px;">
        <div style="color:#FFD700;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">O en cómodas cuotas</div>
        <div style="color:white;font-size:22px;font-weight:800;">$${premium.monthly}/mes <span style="font-size:14px;font-weight:400;opacity:0.7;">× 10</span></div>
      </div>
      <a href="${waLink}" style="display:block;background:linear-gradient(135deg,#FFD700,#FFC200);color:#1E3A8A;padding:16px 36px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 6px 22px rgba(255,215,0,0.45);">
        🛡️ Quiero activar mi seguro →
      </a>
    </div>

    <!-- ¿Qué incluye? -->
    <div style="margin-bottom:26px;">
      <div style="color:#6B7280;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px;">¿Qué cubre tu seguro?</div>
      <div style="background:#F8FAFC;border-radius:12px;padding:6px 20px;">
        ${[
          '🚗 Pérdida total o parcial por colisión',
          '🔥 Incendio, rayo y explosión',
          '🌊 Fenómenos naturales (terremoto, inundación)',
          '🚨 Robo total del vehículo',
          '💥 Responsabilidad civil frente a terceros',
          '🔧 Asistencia en carretera 24/7',
          '🔄 Vehículo de reemplazo (cobertura completa)',
        ].map(item => `
        <div style="display:flex;gap:10px;padding:11px 0;border-bottom:1px solid #F3F4F6;font-size:14px;color:#374151;align-items:center;">
          <span style="flex-shrink:0;">${item.split(' ')[0]}</span>
          <span>${item.split(' ').slice(1).join(' ')}</span>
        </div>`).join('')}
      </div>
    </div>

    <!-- Por qué SegPopular -->
    <div style="background:linear-gradient(135deg,#FFFBEB,#FFF9C4);border:2px solid #FFD700;border-radius:14px;padding:24px;margin-bottom:10px;">
      <div style="color:#1E3A8A;font-size:14px;font-weight:700;margin-bottom:12px;">⭐ ¿Por qué elegir SegPopular?</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${[
          ['🏢', 'Edificio Finistere, Whymper 403, Quito'],
          ['⏱️', 'Trámite de siniestro en 24 horas'],
          ['📋', 'Contratos claros, sin letra pequeña'],
          ['💬', 'Adriana te atiende personalmente por WhatsApp'],
        ].map(([ic, txt]) => `
        <div style="display:flex;gap:10px;align-items:baseline;">
          <span style="font-size:15px;flex-shrink:0;">${ic}</span>
          <span style="color:#374151;font-size:13px;line-height:1.6;">${txt}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- ══ CO-BRANDING COWORKIA ══ -->
  <div style="background:linear-gradient(180deg,#0A1520 0%,#060E17 100%);border-radius:0 0 20px 20px;padding:40px;text-align:center;">
    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:30px;margin-bottom:26px;">
      <div style="color:rgba(255,255,255,0.25);font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Cotización presentada a través de</div>
      <div style="color:white;font-size:22px;font-weight:800;margin-bottom:4px;">Coworkia Business Center</div>
      <div style="color:#FFD700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Ecosistema de Inteligencia Empresarial · Ecuador</div>
    </div>
    <div style="color:rgba(255,255,255,0.25);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Todo el ecosistema a tu servicio</div>
    <div style="margin-bottom:26px;">${ecosistemaItems}</div>
    <div style="color:rgba(255,255,255,0.15);font-size:11px;line-height:1.7;">
      Cotización generada por <strong style="color:rgba(255,255,255,0.3);">Adriana</strong> · SegPopular<br>
      Coworkia Intelligence System · ${fechaFmt}
    </div>
  </div>

</div>
</body>
</html>`;
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
  const html     = buildAdrianaEmailHTML({ ...datos, quoteCode });
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
