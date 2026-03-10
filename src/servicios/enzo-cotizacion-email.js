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
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import { ecosistemaTable } from './email-ecosystem.js';
import { conocimientoEnzo } from '../deteccion-intenciones/enzo-knowledge.js';
import { LOGOS_BASE64 } from './email-assets.js';

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
  const systemPrompt = `Eres Enzo, Director de MarketingLab Ecuador. Experto en IA aplicada a negocios, marketing digital y automatización.

Recibes un mensaje del CEO quien está presencialmente con un cliente potencial y te dicta todos los datos.
Tu tarea: procesar ese mensaje y devolver un JSON con la propuesta lista.

GUÍA DE PRECIOS ECUADOR (mercado realista para startups/PYMES):
- Agentes IA simples: $800-$1,500 USD (FAQ, derivación básica)
- Agentes IA intermedios: $1,800-$3,200 USD (formularios, CRM, integraciones)
- Agentes IA avanzados: $3,500-$5,500 USD (Vision AI, análisis documentos, WhatsApp)
- Mantenimiento mensual: $120-$280/mes según complejidad (1er mes GRATIS)
- Descuento por temporada: 15-25% disponible para cierre rápido

REGLAS para elegir nivel:
- "básico/preguntas frecuentes/FAQ/simple/chatbot" → rango bajo-medio
- "ventas/CRM/formularios/membresías/agendamiento/reservas" → rango medio
- "fotos/imágenes/vision/colisiones/documentos/pagos/análisis visual" → rango medio-alto
- Si no especifica → rango medio (más vendible)

DEBES decidir el precio específico basándote en:
1. Complejidad técnica de lo que necesitan
2. Tamaño/presupuesto aparente de la empresa
3. Urgencia del proyecto
4. Valor que generará para su negocio

Sé realista para el mercado ecuatoriano. No sobrevaloramos.

RESPONDE ÚNICAMENTE con este JSON válido (sin markdown, sin texto extra):
{
  "empresa": "nombre empresa o 'la empresa'",
  "contacto": "nombre del contacto",
  "email": "email@dominio.com",
  "telefono": "+593... o ''",
  "sector": "sector del negocio detectado",
  "necesidad_raw": "frase exacta de lo que necesitan",
  "nivel_agente": "basico|intermedio|avanzado",
  "precio_desarrollo": 2800,
  "precio_con_descuento": 2380,
  "aplica_descuento": true,
  "porcentaje_descuento": 15,
  "razon_descuento": "Descuento por temporada",
  "mantenimiento_mensual": 180,
  "dolor_principal": "problema clave que resuelve este agente para su negocio",
  "roi_estimado": "texto corto de ROI realista para su negocio en Ecuador",
  "casos_uso": ["caso 1 específico para su sector", "caso 2", "caso 3"],
  "intro_personalizada": "párrafo de 3-4 líneas de apertura personalizada para este cliente, convincente, que conecte con su sector y necesidad específica",
  "propuesta_tecnica": "descripción técnica de qué recibirán exactamente, 4-5 líneas, detallada y vendedora",
  "cierre_emocional": "frase de cierre poderosa, 2-3 líneas, conecta con su sector"
}`;

  const raw = await complete(mensajeJefe, {
    system: systemPrompt,
    temperature: 0.4,
    max_tokens: 900,
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

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildEnzoEmailHTML(d) {
  const formatDate = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const waLink = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(
    `Hola Enzo! Soy ${d.contacto} de ${d.empresa}. Quiero avanzar con la propuesta de agente IA que me enviaron.`
  )}`;

  const nivelLabel = {
    basico:    { txt: 'Agente IA Esencial',    sub: 'Responde preguntas frecuentes y deriva casos complejos' },
    intermedio:{ txt: 'Agente IA Profesional', sub: 'Captura leads, califica clientes y automatiza ventas' },
    avanzado:  { txt: 'Agente IA Premium',     sub: 'Analiza fotos/documentos e integra con sistemas externos' },
  }[d.nivel_agente] || { txt: 'Agente IA Profesional', sub: 'Captura leads, califica clientes y automatiza ventas' };

  const incluyeItems = [
    'Análisis y diseño de personalidad del agente',
    'Integración con WhatsApp Business',
    'Entrenamiento inicial con casos de uso de su negocio',
    'Pruebas y ajustes (2 semanas)',
    'Documentación técnica',
    'Capacitación al equipo (2 horas)',
    'Primer mes de mantenimiento GRATIS',
    'Garantía 15 días — si no cumple expectativas, devolvemos',
  ].map(i => `
    <li style="padding:9px 0;display:flex;gap:11px;align-items:baseline;border-bottom:1px solid #F3F4F6;font-size:14px;color:#374151;line-height:1.55;">
      <span style="color:#00C2A0;font-weight:700;flex-shrink:0;">✓</span>${i}
    </li>`).join('');

  const casosItems = (d.casos_uso || []).map((c, i) => `
    <div style="display:flex;gap:14px;padding:14px 0;${i > 0 ? 'border-top:1px solid #F3F4F6;' : ''}">
      <div style="width:30px;height:30px;background:linear-gradient(135deg,#00C2A0,#00A08A);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:800;color:white;">${i+1}</div>
      <div style="font-size:14px;color:#374151;line-height:1.65;padding-top:4px;">${c}</div>
    </div>`).join('');

  const ecosistemaItems = ecosistemaTable({
    aliados: ['gabi', 'angela', 'adriana', 'axel', 'paula', 'aurora'],
    theme: 'dark',
  });

  const precioOriginal  = d.precio_desarrollo;
  const precioFinal     = d.aplica_descuento ? d.precio_con_descuento : d.precio_desarrollo;
  const ahorro          = precioOriginal - precioFinal;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Propuesta MarketingLab IA — ${d.empresa}</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="max-width:660px;margin:30px auto;">

  <!-- ══ HEADER MARKETINGLAB ══ -->
  <div style="background:linear-gradient(145deg,#0D1B2A 0%,#142235 50%,#0A1520 100%);border-radius:20px 20px 0 0;padding:50px 42px 44px;text-align:center;position:relative;overflow:hidden;">
    <!-- Logo MarketingLab real -->
    <div style="margin-bottom:20px;">
      <img src="data:image/png;base64,${LOGOS_BASE64.marketinglab}"
           alt="MarketingLab"
           style="max-width:312px;height:auto;display:block;margin:0 auto;" />
    </div>
    <div style="color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;letter-spacing:3px;text-transform:uppercase;margin-bottom:30px;">Estrategias que funcionan</div>

    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(0,194,160,0.3);border-radius:16px;padding:22px 30px;display:inline-block;">
      <div style="color:#00E5C0;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px;">Propuesta Personalizada</div>
      <div style="color:white;font-size:24px;font-weight:700;margin-bottom:3px;">${d.empresa}</div>
      <div style="color:rgba(255,255,255,0.45);font-size:12px;">${formatDate}</div>
      ${d.quoteCode ? `<div style="color:#00E5C0;font-size:11px;font-family:monospace;letter-spacing:0.5px;margin-top:6px;background:rgba(0,194,160,0.1);border-radius:6px;padding:3px 10px;display:inline-block;">${d.quoteCode}</div>` : ''}
    </div>
  </div>

  <!-- ══ CUERPO ══ -->
  <div style="background:white;padding:42px 42px 10px;">

    <!-- Saludo personalizado (OpenAI) -->
    <div style="background:#F0FDFB;border-left:4px solid #00C2A0;border-radius:0 12px 12px 0;padding:22px 26px;margin-bottom:32px;">
      <p style="color:#0D3B2E;font-size:15px;line-height:1.85;margin:0;">${d.intro_personalizada}</p>
    </div>

    <!-- Sector & Necesidad -->
    <div style="display:flex;gap:14px;margin-bottom:28px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:#F8FAFC;border-radius:12px;padding:18px;text-align:center;">
        <div style="color:#9CA3AF;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Sector</div>
        <div style="color:#1E293B;font-size:15px;font-weight:700;">${d.sector}</div>
      </div>
      <div style="flex:2;min-width:200px;background:#F8FAFC;border-radius:12px;padding:18px;">
        <div style="color:#9CA3AF;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Necesidad identificada</div>
        <div style="color:#1E293B;font-size:14px;font-weight:600;line-height:1.5;">${d.necesidad_raw}</div>
      </div>
    </div>

    <!-- ══ SOLUCIÓN PROPUESTA ══ -->
    <div style="border:2px solid #E2E8F0;border-radius:16px;padding:30px;margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="background:linear-gradient(135deg,#00C2A0,#00A08A);width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🤖</div>
        <div>
          <div style="color:#9CA3AF;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Solución diseñada para ${d.empresa}</div>
          <div style="color:#0D1B2A;font-size:22px;font-weight:800;margin-top:4px;">${nivelLabel.txt}</div>
        </div>
      </div>
      <p style="color:#374151;font-size:15px;line-height:1.75;margin:0 0 24px 0;">${d.propuesta_tecnica}</p>
      <ul style="list-style:none;margin:0;padding:4px 0;">${incluyeItems}</ul>
    </div>

    <!-- ══ CASOS DE USO ESPECÍFICOS ══ -->
    <div style="margin-bottom:28px;">
      <div style="color:#9CA3AF;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:16px;">Cómo trabajará el agente en ${d.empresa}</div>
      <div style="background:#F8FAFC;border-radius:14px;padding:8px 20px;">${casosItems}</div>
    </div>

    <!-- ══ ROI ══ -->
    <div style="background:linear-gradient(135deg,#0D1B2A,#142235);border-radius:16px;padding:30px;margin-bottom:28px;text-align:center;">
      <div style="color:#00E5C0;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">Retorno de inversión estimado</div>
      <div style="color:white;font-size:16px;line-height:1.75;max-width:480px;margin:0 auto 20px;">${d.roi_estimado}</div>
      <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap;">
        <div style="background:rgba(0,194,160,0.12);border:1px solid rgba(0,194,160,0.25);border-radius:10px;padding:14px 22px;">
          <div style="color:#00E5C0;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Disponibilidad</div>
          <div style="color:white;font-size:20px;font-weight:800;">24/7</div>
        </div>
        <div style="background:rgba(0,194,160,0.12);border:1px solid rgba(0,194,160,0.25);border-radius:10px;padding:14px 22px;">
          <div style="color:#00E5C0;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Tiempo respuesta</div>
          <div style="color:white;font-size:20px;font-weight:800;">&lt; 2 seg</div>
        </div>
        <div style="background:rgba(0,194,160,0.12);border:1px solid rgba(0,194,160,0.25);border-radius:10px;padding:14px 22px;">
          <div style="color:#00E5C0;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Error humano</div>
          <div style="color:white;font-size:20px;font-weight:800;">0%</div>
        </div>
      </div>
    </div>

    <!-- ══ INVERSIÓN ══ -->
    <div style="border:2px solid #E2E8F0;border-radius:16px;padding:30px;margin-bottom:28px;">
      <div style="color:#9CA3AF;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:20px;">Inversión</div>

      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:20px;">
        <div>
          ${d.aplica_descuento ? `
          <div style="color:#9CA3AF;font-size:13px;text-decoration:line-through;margin-bottom:4px;">Precio regular: $${precioOriginal.toLocaleString()} USD</div>
          <div style="background:#ECFDF5;border:1px solid #6EE7B7;border-radius:8px;padding:4px 14px;display:inline-block;margin-bottom:8px;">
            <span style="color:#065F46;font-size:12px;font-weight:700;">🎁 ${d.razon_descuento || 'Descuento por temporada'} ${d.porcentaje_descuento || 20}% = -$${ahorro.toLocaleString()}</span>
          </div>
          ` : ''}
          <div>
            <span style="color:#0D1B2A;font-size:38px;font-weight:900;">$${precioFinal.toLocaleString()}</span>
            <span style="color:#6B7280;font-size:14px;"> USD desarrollo</span>
          </div>
          <div style="color:#6B7280;font-size:13px;margin-top:6px;">+ $${d.mantenimiento_mensual}/mes mantenimiento<br><span style="color:#00A08A;font-weight:600;">Primer mes de mantenimiento GRATIS ✓</span></div>
        </div>

        <div style="text-align:right;">
          <div style="color:#9CA3AF;font-size:12px;margin-bottom:6px;">Modalidad de pago</div>
          <div style="background:#F8FAFC;border-radius:10px;padding:14px 18px;text-align:left;">
            <div style="color:#374151;font-size:13px;line-height:1.8;">
              50% inicio → <strong>$${Math.round(precioFinal/2).toLocaleString()} USD</strong><br>
              50% entrega → <strong>$${Math.round(precioFinal/2).toLocaleString()} USD</strong><br>
              Mantenimiento mensual adelantado
            </div>
          </div>
        </div>
      </div>

      <div style="background:#FEF9EC;border:1px solid #FCD34D;border-radius:8px;padding:12px 16px;margin-top:18px;">
        <div style="color:#92400E;font-size:12px;line-height:1.7;">
          ⏰ <strong>Oferta válida 30 días</strong> · ⚡ Tiempo de desarrollo: 3-4 semanas · 🛡️ Garantía 15 días
        </div>
      </div>
    </div>

    <!-- ══ CTA ══ -->
    <div style="background:linear-gradient(145deg,#0D1B2A,#0A1520);border-radius:18px;padding:38px;text-align:center;margin-bottom:10px;">
      <div style="color:#00E5C0;font-size:14px;font-weight:600;margin-bottom:10px;">Próximo paso</div>
      <p style="color:rgba(255,255,255,0.8);font-size:15px;line-height:1.75;margin:0 0 26px 0;max-width:400px;margin-left:auto;margin-right:auto;">${d.cierre_emocional}</p>
      <a href="${waLink}" style="display:inline-block;background:linear-gradient(135deg,#00C2A0,#00E5C0);color:#0D1B2A;padding:17px 44px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:0.3px;box-shadow:0 6px 24px rgba(0,194,160,0.5);">
        💬 Quiero avanzar con mi agente IA →
      </a>
      <div style="margin-top:18px;">
        <div style="color:#374151;font-size:13px;line-height:1.7;background:#F8FAFC;border-radius:10px;padding:14px;">
          Propuesta elaborada por <strong>Enzo</strong> — MarketingLab<br>
          📧 secretaria.coworkia@gmail.com &nbsp;|&nbsp; 📱 +593 98 777 0788
        </div>
      </div>
    </div>
  </div>

  <!-- ══ CO-BRANDING COWORKIA ══ -->
  <div style="background:linear-gradient(180deg,#060E17 0%,#0A1520 100%);border-radius:0 0 20px 20px;padding:44px;text-align:center;">
    <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:32px;margin-bottom:28px;">
      <div style="color:rgba(255,255,255,0.25);font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Propuesta presentada a través de</div>
      <div style="color:white;font-size:22px;font-weight:800;margin-bottom:4px;">Coworkia Business Center</div>
      <div style="color:#00C2A0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Ecosistema de Inteligencia Empresarial · Ecuador</div>
    </div>

    <div style="color:rgba(255,255,255,0.25);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Todos los agentes IA del ecosistema</div>
    <div style="margin-bottom:28px;">${ecosistemaItems}</div>

    <div style="background:rgba(0,194,160,0.06);border:1px solid rgba(0,194,160,0.12);border-radius:10px;padding:14px;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;line-height:1.8;margin:0;">
        Un solo ecosistema. Agentes especializados que se hablan entre sí.<br>
        <strong style="color:rgba(255,255,255,0.75);">Haz clic en cualquier agente para hablar por WhatsApp.</strong>
      </p>
    </div>
  </div>

  <!-- FOOTER COWORKIA (mismo que Aluna/Aurora) -->
  <div style="background:linear-gradient(135deg,#00C2A0,#00A08A);text-align:center;padding:28px;border-radius:0 0 20px 20px;">
    <div style="color:#E0F7F4;font-size:22px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;">Coworkia</div>
    <div style="color:rgba(224,247,244,0.7);font-size:10px;letter-spacing:2px;margin-bottom:2px;text-transform:uppercase;">work · connect · grow</div>
    <div style="color:rgba(224,247,244,0.6);font-size:12px;line-height:1.6;margin-top:12px;">
      © 2026 Coworkia Ecuador — Espacios que inspiran<br>
      Whymper 403, Edificio Finistere, Quito<br>
      <span style="font-size:11px;margin-top:6px;display:block;">secretaria.coworkia@gmail.com · +593 98 777 0788</span>
    </div>
  </div>

</div>
</body>
</html>`;
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

  // 2. Construir HTML con el código de documento
  const html = buildEnzoEmailHTML({ ...datos, quoteCode });

  const NIVEL_LABEL = {
    basico: 'Agente IA Esencial', intermedio: 'Agente IA Profesional', avanzado: 'Agente IA Premium',
  };
  const codeLabel = quoteCode ? `${quoteCode} — ` : '';
  const subject   = `Cotización 🚀 ${codeLabel}${NIVEL_LABEL[datos.nivel_agente] || 'Propuesta IA'} · ${datos.empresa} | Enzo - MarketingLab`;

  // 3. Enviar
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
