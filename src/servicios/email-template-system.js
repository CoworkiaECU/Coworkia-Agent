/**
 * 📧 EMAIL TEMPLATE SYSTEM — Sistema centralizado de templates HTML
 *
 * Branding por agente + templates profesionales para todos los emails
 * del ecosistema Coworkia Agent.
 *
 * Uso:
 *   import { buildEmailTemplate, buildAlunaD1HTML, AGENT_BRANDING } from './email-template-system.js';
 *   const html = buildEmailTemplate('ALUNA', 'D1', { name, message });
 */

// ─── BRANDING POR AGENTE ──────────────────────────────────────────────────────

export const AGENT_BRANDING = {
  AURORA: {
    name: 'Aurora',
    fullName: 'Aurora · Coworkia Reservas',
    primaryColor: '#4ECDC4',
    secondaryColor: '#44A08D',
    gradient: 'linear-gradient(135deg, #5DE5DB 0%, #3B9177 100%)',
    emoji: '🏢',
    companyName: 'Coworkia',
    tagline: 'Tu espacio de trabajo ideal en Quito',
  },
  ALUNA: {
    name: 'Aluna',
    fullName: 'Aluna · MarketingLab',
    primaryColor: '#8B5CF6',
    secondaryColor: '#6D28D9',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    emoji: '💼',
    companyName: 'MarketingLab',
    tagline: 'Soluciones de marketing que transforman negocios',
  },
  ENZO: {
    name: 'Enzo',
    fullName: 'Enzo · MarketingLab',
    primaryColor: '#F97316',
    secondaryColor: '#EA580C',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    emoji: '🎯',
    companyName: 'MarketingLab',
    tagline: 'Proyectos creativos con resultados reales',
  },
  ADRIANA: {
    name: 'Adriana',
    fullName: 'Adriana · SegPopular',
    primaryColor: '#1E3A8A',
    secondaryColor: '#1e40af',
    accentColor: '#FCD34D',
    gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
    emoji: '🛡️',
    companyName: 'SegPopular',
    tagline: 'Protegemos lo que más importa',
  },
  AXEL: {
    name: 'Axel',
    fullName: 'Axel · AutoService',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    emoji: '🔧',
    companyName: 'AutoService',
    tagline: 'Cotizaciones rápidas, servicio confiable',
  },
  GABI: {
    name: 'Gabi',
    fullName: 'Gabi · Asesoría Legal',
    primaryColor: '#D97706',
    secondaryColor: '#92400E',
    gradient: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
    emoji: '⚖️',
    companyName: 'Asesoría Legal',
    tagline: 'Consultoría jurídica de confianza',
  },
  PAULA: {
    name: 'Paula',
    fullName: 'Paula · Propiedades',
    primaryColor: '#7C3AED',
    secondaryColor: '#5B21B6',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
    emoji: '🏠',
    companyName: 'Paula Propiedades',
    tagline: 'Encuentra el hogar perfecto',
  },
};

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

/**
 * Reemplaza {{variable}} en un string template.
 * Soporta: {{nombre}}, {{plan}}, {{precio}}, {{empresa}}, etc.
 */
export function replaceVariables(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/** Footer estándar Coworkia */
function buildCoworkiaFooter(branding) {
  return `
    <div style="background:${branding.gradient};padding:32px 24px;text-align:center;border-radius:0 0 12px 12px;">
      <div style="color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-bottom:12px;">${branding.emoji} ${branding.companyName}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:8px;">${branding.tagline}</div>
      <div style="color:rgba(255,255,255,0.65);font-size:12px;">📍 Av. República del Salvador N34-183 · Quito, Ecuador · 📞 +593 98 777 0788</div>
    </div>`;
}

// ─── TEMPLATE: ALUNA D+1 ─────────────────────────────────────────────────────

/**
 * 💼 Email D+1 — Aluna Seguimiento de Membresía
 * Branding: morado #8B5CF6, profesional y cálido
 *
 * @param {string} name    — Nombre del prospecto
 * @param {string} message — Cuerpo del mensaje (texto del operador)
 * @param {string} [plan]  — Nombre del plan (default: Membresía Coworkia)
 */
export function buildAlunaD1HTML({ name, message, plan = 'Membresía Coworkia' }) {
  const branding  = AGENT_BRANDING.ALUNA;
  const firstName = name ? name.split(' ')[0] : 'allí';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu membresía en Coworkia te espera</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:${branding.gradient};padding:40px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-bottom:16px;">💼 MARKETINGLAB · MEMBRESÍAS</div>
    <h1 style="color:white;margin:0;font-size:26px;font-weight:800;line-height:1.2;">Hola ${firstName} 👋</h1>
    <p style="color:rgba(255,255,255,0.9);margin:12px 0 0;font-size:15px;">Te quería dar seguimiento a tu consulta</p>
  </div>

  <!-- Body -->
  <div style="background:white;padding:36px 32px;">

    <!-- Mensaje del operador -->
    <div style="color:#374151;font-size:15px;line-height:1.8;white-space:pre-line;margin-bottom:28px;">${message}</div>

    <!-- Plan card -->
    <div style="background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:12px;padding:24px;margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:40px;height:40px;background:${branding.primaryColor};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">💼</div>
        <div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Plan</div>
          <div style="font-size:16px;font-weight:700;color:#1f2937;">${plan}</div>
        </div>
      </div>
      <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2.2;">
        <li>✅ Espacio totalmente equipado</li>
        <li>✅ Café y snacks ilimitados</li>
        <li>✅ WiFi 200 Mbps de alta velocidad</li>
        <li>✅ Salas de reuniones incluidas</li>
        <li>✅ Acceso 24/7</li>
        <li>🎁 <strong>1 semana de prueba gratis</strong></li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="https://wa.me/593987770788?text=Hola%2C%20quiero%20agendar%20mi%20semana%20gratis%20en%20Coworkia"
         style="display:inline-block;background:${branding.primaryColor};color:white;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(139,92,246,0.35);">
        📅 Agendar semana gratis →
      </a>
    </div>
  </div>

  <!-- Footer -->
  ${buildCoworkiaFooter(branding)}

</div>
</body>
</html>`;
}

// ─── TEMPLATE: ALUNA D+3 (FOMO) ──────────────────────────────────────────────

/**
 * 🔥 Email D+3 — Aluna FOMO (urgencia)
 * Branding: morado profundo + rojo urgencia
 *
 * @param {string} name    — Nombre del prospecto
 * @param {string} message — Cuerpo del mensaje (texto del operador)
 */
export function buildAlunaD3HTML({ name, message }) {
  const branding  = AGENT_BRANDING.ALUNA;
  const firstName = name ? name.split(' ')[0] : 'allí';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚠️ Últimas disponibilidades — Coworkia</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header urgencia -->
  <div style="background:linear-gradient(135deg, #dc2626 0%, #9f1239 100%);padding:36px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="background:rgba(255,255,255,0.2);display:inline-block;padding:5px 16px;border-radius:99px;color:white;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">⚠️ ÚLTIMA OPORTUNIDAD</div>
    <h1 style="color:white;margin:0;font-size:26px;font-weight:800;line-height:1.2;">${firstName}, ¡quedan pocos espacios!</h1>
    <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">📅 Esta oferta vence pronto</p>
  </div>

  <!-- Body -->
  <div style="background:white;padding:36px 32px;">

    <!-- Mensaje del operador -->
    <div style="color:#374151;font-size:15px;line-height:1.8;white-space:pre-line;margin-bottom:24px;">${message}</div>

    <!-- Urgencia card -->
    <div style="background:#fff5f5;border:1.5px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:20px;">
      <h3 style="margin:0 0 12px;color:#dc2626;font-size:15px;font-weight:700;">🚨 ¿Por qué decidir hoy?</h3>
      <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2.2;">
        <li>⏰ Solo quedan 2–3 espacios disponibles este mes</li>
        <li>📈 Ya tenemos 3 interesados más esta semana</li>
        <li>🎁 La semana gratis aplica solo este mes</li>
      </ul>
    </div>

    <!-- Testimonio -->
    <div style="background:#faf5ff;border-left:4px solid ${branding.primaryColor};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;color:#374151;font-size:14px;font-style:italic;line-height:1.7;">
        "Esperé demasiado y cuando quise reservar ya no había espacio. No cometas el mismo error."<br>
        <strong style="color:#1f2937;">— Juan M., cliente anterior</strong>
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="https://wa.me/593987770788?text=Quiero%20reservar%20antes%20de%20que%20se%20agoten"
         style="display:inline-block;background:#dc2626;color:white;padding:16px 36px;border-radius:8px;text-decoration:none;font-weight:800;font-size:16px;box-shadow:0 4px 16px rgba(220,38,38,0.4);">
        🔥 RESERVAR AHORA →
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Respuesta garantizada en menos de 5 minutos</p>
    </div>
  </div>

  <!-- Footer -->
  ${buildCoworkiaFooter(branding)}

</div>
</body>
</html>`;
}

// ─── TEMPLATE: ADRIANA COMPARATIVO ───────────────────────────────────────────

/**
 * 🛡️ Email comparativo Adriana — SegPopular vs VAZ Seguros
 * Branding: navy #1E3A8A + dorado #FCD34D
 *
 * @param {string} name             — Nombre del cliente
 * @param {string} vehiculo         — Descripción del vehículo
 * @param {number} valorComercial   — Valor comercial del vehículo
 * @param {number} primaAnual       — Prima anual SegPopular
 * @param {number} [primaVAZ]       — Prima anual VAZ Seguros (competencia)
 * @param {string} [message]        — Intro personalizada (opcional)
 * @param {string} [waNumber]       — Número WA del asesor
 * @param {string} [quoteCode]      — Código de cotización
 */
export function buildAdrianaComparisonHTML({
  name,
  vehiculo,
  valorComercial,
  primaAnual,
  primaVAZ,
  message = '',
  waNumber = '593987770788',
  quoteCode = '',
}) {
  const branding  = AGENT_BRANDING.ADRIANA;
  const firstName = name ? name.split(' ')[0] : 'allí';
  const ahorro    = (primaVAZ && primaAnual) ? Math.round(primaVAZ - primaAnual) : 0;
  const codeSuffix = quoteCode ? ` — Ref. ${quoteCode}` : '';
  const vehiculoEncoded = encodeURIComponent(vehiculo || 'mi vehículo');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comparativo de Seguros — SegPopular${codeSuffix}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:${branding.gradient};padding:40px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-bottom:12px;">🛡️ SEGPOPULAR · ECUADOR</div>
    <h1 style="color:#FCD34D;margin:0;font-size:24px;font-weight:800;line-height:1.3;">
      Comparativo de Seguros<br>
      <span style="font-size:16px;color:rgba(255,255,255,0.9);font-weight:500;">${vehiculo || 'Vehículo'}</span>
    </h1>
    ${quoteCode ? `<div style="margin-top:12px;background:rgba(255,255,255,0.15);display:inline-block;padding:4px 16px;border-radius:99px;color:rgba(255,255,255,0.9);font-size:12px;">Ref: ${quoteCode}</div>` : ''}
  </div>

  <!-- Body -->
  <div style="background:white;padding:36px 32px;">

    <!-- Intro -->
    <p style="color:#374151;font-size:15px;line-height:1.8;margin-top:0;">
      Hola <strong>${firstName}</strong>, ${message || 'aquí tienes el comparativo personalizado para tu seguro vehicular.'}
    </p>

    <!-- Tabla comparativa -->
    <div style="margin:24px 0;border-radius:12px;overflow:hidden;border:1.5px solid #e5e7eb;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#1E3A8A;">
            <th style="padding:14px 16px;text-align:left;color:white;font-size:13px;font-weight:700;width:40%;">Cobertura</th>
            <th style="padding:14px 16px;text-align:center;color:#FCD34D;font-size:13px;font-weight:700;width:30%;">🛡️ SegPopular</th>
            <th style="padding:14px 16px;text-align:center;color:rgba(255,255,255,0.65);font-size:13px;font-weight:700;width:30%;">VAZ Seguros</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#f8fafc;">
            <td style="padding:13px 16px;font-size:13px;color:#374151;font-weight:600;">Prima anual</td>
            <td style="padding:13px 16px;text-align:center;font-size:18px;font-weight:800;color:#16a34a;">$${Number(primaAnual).toLocaleString()}</td>
            <td style="padding:13px 16px;text-align:center;font-size:14px;color:#9ca3af;${primaVAZ ? 'text-decoration:line-through;' : ''}">${primaVAZ ? '$' + Number(primaVAZ).toLocaleString() : 'Consultar'}</td>
          </tr>
          <tr>
            <td style="padding:13px 16px;font-size:13px;color:#374151;">Pago en cuotas</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#374151;">✅ Hasta 10 cuotas</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#6b7280;">Varía</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:13px 16px;font-size:13px;color:#374151;">Responsabilidad civil</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#374151;">✅ Incluida</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#6b7280;">✅ Incluida</td>
          </tr>
          <tr>
            <td style="padding:13px 16px;font-size:13px;color:#374151;">Asistencia vial 24h</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#374151;">✅ Incluida</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#6b7280;">Extra</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:13px 16px;font-size:13px;color:#374151;">Auto sustituto</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#374151;">✅ Hasta 10 días</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#6b7280;">No incluye</td>
          </tr>
          <tr>
            <td style="padding:13px 16px;font-size:13px;color:#374151;">Trámites SRI / matrícula</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#374151;">✅ Gestionamos</td>
            <td style="padding:13px 16px;text-align:center;font-size:13px;color:#6b7280;">Por cuenta cliente</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Badge ahorro -->
    ${ahorro > 0 ? `
    <div style="background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:1.5px solid #86efac;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <div style="font-size:12px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Tu ahorro vs. la competencia</div>
      <div style="font-size:32px;font-weight:900;color:#16a34a;">$${ahorro.toLocaleString()}/año</div>
      <div style="font-size:13px;color:#374151;margin-top:4px;">con SegPopular este año</div>
    </div>
    ` : ''}

    <!-- Info vehículo -->
    <div style="background:#f9fafb;border-radius:10px;padding:14px 20px;font-size:13px;color:#6b7280;text-align:center;margin-bottom:28px;">
      <span style="font-weight:600;color:#374151;">Vehículo:</span> ${vehiculo}
      ${valorComercial ? ` &nbsp;·&nbsp; <span style="font-weight:600;color:#374151;">Valor comercial:</span> $${Number(valorComercial).toLocaleString()}` : ''}
    </div>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="https://wa.me/${waNumber}?text=Hola%20Adriana%2C%20acepto%20la%20cotizaci%C3%B3n%20de%20seguro%20para%20${vehiculoEncoded}"
         style="display:inline-block;background:#1E3A8A;color:#FCD34D;padding:16px 36px;border-radius:8px;text-decoration:none;font-weight:800;font-size:16px;box-shadow:0 4px 16px rgba(30,58,138,0.3);">
        ✅ Acepto esta cotización →
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Adriana te responde en WhatsApp en minutos</p>
    </div>
  </div>

  <!-- Footer Adriana -->
  <div style="background:#1E3A8A;padding:32px 24px;text-align:center;border-radius:0 0 12px 12px;">
    <div style="color:#FCD34D;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">🛡️ SegPopular Ecuador</div>
    <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:8px;">Protegemos lo que más importa</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;">Adriana — Asesora de Seguros Vehiculares · +593 987 770 788</div>
  </div>

</div>
</body>
</html>`;
}

// ─── DISPATCHER CENTRAL ──────────────────────────────────────────────────────

/**
 * 🚀 buildEmailTemplate — Wrapper central para todos los templates
 *
 * @param {string} agent  — 'ALUNA', 'AURORA', 'ADRIANA', etc.
 * @param {string} type   — 'd1', 'd3', 'comparison', etc.
 * @param {object} data   — Datos del template
 * @returns {string} HTML del email
 */
export function buildEmailTemplate(agent, type, data) {
  const key = `${agent.toUpperCase()}_${type.toUpperCase()}`;

  const builders = {
    ALUNA_D1:            () => buildAlunaD1HTML(data),
    ALUNA_D3:            () => buildAlunaD3HTML(data),
    ADRIANA_COMPARISON:  () => buildAdrianaComparisonHTML(data),
  };

  const builder = builders[key];
  if (!builder) {
    console.warn(`[EMAIL-TEMPLATE-SYSTEM] ⚠️ Template no encontrado: ${key}. Usando fallback.`);
    return buildFallbackHTML(agent, data);
  }

  return builder();
}

// ─── FALLBACK ─────────────────────────────────────────────────────────────────

function buildFallbackHTML(agent, { name = '', message = '' }) {
  const branding = AGENT_BRANDING[agent.toUpperCase()] || AGENT_BRANDING.AURORA;
  return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${branding.gradient};padding:24px;border-radius:10px 10px 0 0;text-align:center;">
    <h2 style="color:white;margin:0;">${branding.emoji} ${branding.companyName}</h2>
  </div>
  <div style="background:white;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;">
    ${name ? `<p>Hola <strong>${name.split(' ')[0]}</strong>!</p>` : ''}
    <div style="white-space:pre-line;line-height:1.7;color:#374151;">${message}</div>
  </div>
</body>
</html>`;
}
