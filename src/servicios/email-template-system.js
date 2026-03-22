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
      <a href="https://wa.me/593994837117?text=Hola%2C%20quiero%20agendar%20mi%20semana%20gratis%20en%20Coworkia"
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
      <a href="https://wa.me/593994837117?text=Quiero%20reservar%20antes%20de%20que%20se%20agoten"
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
  waNumber = '593994837117',
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

// ─── TEMPLATE: AURORA CONFIRMATION +1h ─────────────────────────────────────

/**
 * 🏢 Email de confirmación/agradecimiento +1h post-reserva (Aurora)
 * @param {string} nombre    — Nombre del cliente
 * @param {string} servicio  — Hot Desk / Sala de Reuniones
 * @param {string} dia       — Fecha de la reserva (ej: "lunes 24 de marzo")
 * @param {string} hora      — Hora de la reserva (ej: "10:00 AM")
 * @param {string} [precio]  — Precio si aplica
 */
export function buildAuroraConfirmationHTML({ nombre, servicio, dia, hora, precio = '' }) {
  const b = AGENT_BRANDING.AURORA;
  const firstName = nombre ? nombre.split(' ')[0] : 'amig@';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:${b.gradient};padding:36px 32px;text-align:center;">
    <img src="/images/logos/coworkia.svg" alt="Coworkia" style="height:40px;margin-bottom:12px;filter:brightness(0) invert(1);" onerror="this.style.display='none'">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">¡Reserva Confirmada! 🎉</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Tu espacio está listo en Coworkia</p>
  </div>

  <!-- Body -->
  <div style="padding:36px 32px;">
    <p style="font-size:16px;color:#1e293b;margin:0 0 20px;">Hola <strong>${firstName}</strong> 👋</p>
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px;">
      Confirmamos tu reserva de <strong>${servicio}</strong> para el <strong>${dia}</strong> a las <strong>${hora}</strong>.
      Estamos felices de verte pronto en Coworkia.
    </p>

    <!-- Detalles Box -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${b.primaryColor};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">📋 Detalles de tu Reserva</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-size:14px;color:#64748b;width:40%;">Servicio</td><td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;">${servicio}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Fecha</td><td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;">${dia}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Hora</td><td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;">${hora}</td></tr>
        ${precio ? `<tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Precio</td><td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;">${precio}</td></tr>` : ''}
      </table>
    </div>

    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px;">
      ¿Necesitas algo para tu visita? Responde a este mensaje o escríbenos por WhatsApp y con gusto te ayudamos. ☕
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="https://wa.me/${process.env.BOT_PHONE || '593994837117'}?text=Hola%20Aurora%2C%20tengo%20una%20reserva%20para%20${encodeURIComponent(dia)}"
         style="display:inline-block;background:${b.primaryColor};color:#fff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
        💬 Contactar por WhatsApp
      </a>
    </div>
  </div>

  ${buildCoworkiaFooter(b)}
</div>
</body>
</html>`;
}

// ─── TEMPLATE: AURORA REBOOKING D+7 ─────────────────────────────────────────

/**
 * 🔁 Email D+7 re-booking (Aurora) — Invitar a volver
 * @param {string} nombre    — Nombre del cliente
 * @param {string} servicio  — Servicio que usó
 * @param {string} [descuento] — Código de descuento (opcional)
 */
export function buildAuroraRebookingHTML({ nombre, servicio, descuento = '' }) {
  const b = AGENT_BRANDING.AURORA;
  const firstName = nombre ? nombre.split(' ')[0] : 'amig@';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:${b.gradient};padding:36px 32px;text-align:center;">
    <img src="/images/logos/coworkia.svg" alt="Coworkia" style="height:40px;margin-bottom:12px;filter:brightness(0) invert(1);" onerror="this.style.display='none'">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">¡Te extrañamos, ${firstName}! 👋</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Han pasado 7 días desde tu última visita</p>
  </div>

  <!-- Body -->
  <div style="padding:36px 32px;">
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
      Esperamos que hayas disfrutado tu ${servicio} en Coworkia. 
      Tu productividad es nuestra misión y nos encantaría que volvieras pronto. 🚀
    </p>

    ${descuento ? `
    <!-- Descuento especial -->
    <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid ${b.primaryColor};border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:13px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:1px;">🎁 Regalo de Regreso</div>
      <div style="font-size:28px;font-weight:800;color:#047857;margin:8px 0;">${descuento}</div>
      <div style="font-size:13px;color:#6b7280;">Usa este código en tu próxima reserva</div>
    </div>` : ''}

    <div style="background:#f8fafc;border-left:4px solid ${b.primaryColor};border-radius:8px;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
        ✅ <strong>Hot Desk</strong> disponible todos los días<br>
        ✅ <strong>Salas de reuniones</strong> para 4-8 personas<br>
        ✅ WiFi de alta velocidad · Café incluido · Estacionamiento
      </p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://wa.me/${process.env.BOT_PHONE || '593994837117'}?text=Hola%20Aurora%2C%20quiero%20hacer%20una%20nueva%20reserva"
         style="display:inline-block;background:${b.primaryColor};color:#fff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
        📅 Reservar de Nuevo
      </a>
    </div>
  </div>

  ${buildCoworkiaFooter(b)}
</div>
</body>
</html>`;
}

// ─── TEMPLATE: ENZO D+1 ─────────────────────────────────────────────────────

/**
 * 🎯 Email D+1 — Enzo seguimiento suave (sin descuento)
 * @param {string} nombre   — Nombre del prospecto
 * @param {string} proyecto — Tipo de proyecto / servicio cotizado
 * @param {string} message  — Mensaje personalizado
 */
export function buildEnzoD1HTML({ nombre, proyecto = 'tu proyecto', message = '' }) {
  const b = AGENT_BRANDING.ENZO;
  const firstName = nombre ? nombre.split(' ')[0] : '';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:${b.gradient};padding:36px 32px;text-align:center;">
    <img src="/images/logos/enzo.svg" alt="MarketingLab" style="height:40px;margin-bottom:12px;filter:brightness(0) invert(1);" onerror="this.style.display='none'">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">¿Seguimos adelante? 🚀</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">MarketingLab — Proyectos que transforman negocios</p>
  </div>

  <!-- Body -->
  <div style="padding:36px 32px;">
    <p style="font-size:16px;color:#1e293b;margin:0 0 16px;">Hola ${firstName ? `<strong>${firstName}</strong>` : 'amig@'} 👋</p>
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
      ${message || `¿Sigues pensando en avanzar con <strong>${proyecto}</strong>? 
      Nos encantaría ayudarte a materializar tu visión con una estrategia a medida.`}
    </p>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:13px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">💡 Lo que podemos hacer por ti</div>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;">
        🎯 Estrategia de marketing personalizada<br>
        📱 Gestión de redes sociales profesional<br>
        🎨 Diseño creativo que convierte<br>
        📊 Reportes de resultados mensuales
      </p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://wa.me/${process.env.BOT_PHONE || '593994837117'}?text=Hola%20Enzo%2C%20quiero%20agendar%20una%20llamada"
         style="display:inline-block;background:${b.primaryColor};color:#fff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
        📞 Agendar Llamada Gratis
      </a>
    </div>
  </div>

  ${buildCoworkiaFooter(b)}
</div>
</body>
</html>`;
}

// ─── TEMPLATE: ENZO D+3 ─────────────────────────────────────────────────────

/**
 * 🎯 Email D+3 — Enzo FOMO + descuento "Solo hoy" 15% OFF
 * @param {string} nombre    — Nombre del prospecto
 * @param {string} proyecto  — Tipo de proyecto / servicio
 * @param {number} [descuento] — Porcentaje de descuento (default: 15)
 */
export function buildEnzoD3HTML({ nombre, proyecto = 'tu proyecto', descuento = 15 }) {
  const b = AGENT_BRANDING.ENZO;
  const firstName = nombre ? nombre.split(' ')[0] : '';
  const vence = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Urgency banner -->
  <div style="background:#dc2626;padding:10px;text-align:center;">
    <span style="color:#fff;font-size:13px;font-weight:700;">⏰ OFERTA ESPECIAL · VENCE ${vence.toUpperCase()}</span>
  </div>

  <!-- Header -->
  <div style="background:${b.gradient};padding:32px 32px;text-align:center;">
    <img src="/images/logos/enzo.svg" alt="MarketingLab" style="height:40px;margin-bottom:12px;filter:brightness(0) invert(1);" onerror="this.style.display='none'">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🎁 ${descuento}% OFF — Solo Hoy</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Oferta exclusiva para ${firstName || 'ti'}</p>
  </div>

  <!-- Descuento destacado -->
  <div style="background:#fef3c7;border:2px solid #fbbf24;padding:28px 32px;text-align:center;">
    <div style="font-size:52px;font-weight:900;color:#d97706;line-height:1;">${descuento}<span style="font-size:28px;">%</span></div>
    <div style="font-size:16px;font-weight:700;color:#92400e;margin:8px 0 4px;">DESCUENTO EN TU PRIMER PROYECTO</div>
    <div style="font-size:13px;color:#6b7280;">Válido solo para contratar hoy · No acumulable con otras ofertas</div>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px;">
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
      ${firstName ? `<strong>${firstName}</strong>, t` : 'T'}odavía estamos guardando tu lugar para <strong>${proyecto}</strong>. 
      Este descuento es nuestra forma de decirte que creemos en tu proyecto y queremos ser parte de él.
    </p>

    <div style="background:#f8fafc;border-left:4px solid ${b.primaryColor};border-radius:8px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#374151;line-height:1.6;">
      ✅ Sin contrato de permanencia<br>
      ✅ Resultados medibles desde el primer mes<br>
      ✅ Equipo dedicado a tu proyecto
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="https://wa.me/${process.env.BOT_PHONE || '593994837117'}?text=Hola%20Enzo%2C%20quiero%20aprovechar%20el%20${descuento}%25%20de%20descuento"
         style="display:inline-block;background:#dc2626;color:#fff;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;">
        🎁 Quiero Mi ${descuento}% OFF
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin:8px 0 0;">Responde este email o escríbenos por WhatsApp antes de medianoche</p>
  </div>

  ${buildCoworkiaFooter(b)}
</div>
</body>
</html>`;
}

// ─── TEMPLATE: ENZO D+7 ─────────────────────────────────────────────────────

/**
 * 🎯 Email D+7 — Enzo último intento + caso de éxito
 * @param {string} nombre     — Nombre del prospecto
 * @param {string} proyecto   — Tipo de proyecto
 * @param {string} [caseStudy] — Descripción del caso de éxito (opcional)
 */
export function buildEnzoD7HTML({ nombre, proyecto = 'tu proyecto', caseStudy = '' }) {
  const b = AGENT_BRANDING.ENZO;
  const firstName = nombre ? nombre.split(' ')[0] : '';
  const defaultCase = 'Cliente del sector retail aumentó sus ventas online un 300% en 3 meses con nuestra estrategia de contenidos y pauta digital.';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:${b.gradient};padding:36px 32px;text-align:center;">
    <img src="/images/logos/enzo.svg" alt="MarketingLab" style="height:40px;margin-bottom:12px;filter:brightness(0) invert(1);" onerror="this.style.display='none'">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📈 Mira lo que logramos</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Resultados reales para negocios reales</p>
  </div>

  <!-- Body -->
  <div style="padding:36px 32px;">
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
      ${firstName ? `<strong>${firstName}</strong>, a` : 'A'}ntes de que cerremos tu cotización para <strong>${proyecto}</strong>, 
      queremos compartir algo que te puede interesar:
    </p>

    <!-- Caso de éxito -->
    <div style="background:#fff7ed;border:2px solid ${b.primaryColor};border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="font-size:11px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">📊 Caso de Éxito Real</div>
      <blockquote style="margin:0;font-size:15px;color:#374151;line-height:1.7;font-style:italic;border-left:3px solid ${b.primaryColor};padding-left:16px;">
        "${caseStudy || defaultCase}"
      </blockquote>
      <div style="margin-top:12px;font-size:12px;color:#6b7280;">— Cliente MarketingLab · Resultados verificados</div>
    </div>

    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 20px;">
      ¿Te gustaría un resultado similar? Si en este momento no es el momento correcto, 
      no hay problema — guarda nuestro contacto para cuando estés listo. 🤝
    </p>

    <div style="text-align:center;margin:24px 0;display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
      <a href="https://wa.me/${process.env.BOT_PHONE || '593994837117'}?text=Hola%20Enzo%2C%20me%20interesa%20el%20proyecto"
         style="display:inline-block;background:${b.primaryColor};color:#fff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        ✅ Me interesa
      </a>
      <a href="https://wa.me/${process.env.BOT_PHONE || '593994837117'}?text=Hola%20Enzo%2C%20guardar%20para%20despues"
         style="display:inline-block;background:#f1f5f9;color:#475569;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        📌 Para después
      </a>
    </div>
  </div>

  ${buildCoworkiaFooter(b)}
</div>
</body>
</html>`;
}

// ─── TEMPLATE: ADRIANA COMPARISON V2 ─────────────────────────────────────────

/**
 * 🛡️ Email comparativo VAZ Seguros V2 — con tabla de competidores dinámica
 *
 * Compatible con el caso real Javier Troya (SEG-DEMO-0011).
 *
 * @param {object} data
 * @param {string}   data.nombre             — Nombre completo del cliente
 * @param {string}   [data.marca]            — Marca del vehículo
 * @param {string}   [data.modelo]           — Modelo del vehículo
 * @param {number|string} [data.anio]        — Año
 * @param {string}   [data.placa]            — Placa
 * @param {string}   [data.valor_asegurado]  — Ej: "$42,000"
 * @param {string}   [data.vaz_prima_anual]  — Ej: "$1,101"
 * @param {string}   [data.vaz_prima_mensual]— Ej: "$110"
 * @param {string}   [data.vaz_deducible]    — Ej: "7% (Taller VAZ)"
 * @param {string}   [data.analisis_broker]  — Párrafo análisis personalizado
 * @param {Array}    [data.competitors]      — Filas de competidores (puede ser [])
 * @param {string}   [data.fecha_cotizacion] — Fecha formatted
 * @param {string}   [data.bot_phone]        — Número WA bot
 * @param {string}   [data.adriana_email]    — Email de Adriana
 * @param {string}   [data.adriana_phone]    — Teléfono de Adriana
 */
export function buildAdrianaComparisonV2HTML({
  nombre = '',
  marca = '', modelo = '', anio = '', placa = '',
  valor_asegurado = '',
  vaz_prima_anual = '',
  vaz_prima_mensual = '',
  vaz_deducible = '7% (Taller VAZ)',
  analisis_broker = '',
  competitors = [],
  fecha_cotizacion = new Date().toLocaleDateString('es-EC'),
  bot_phone = process.env.BOT_PHONE || '593994837117',
  adriana_email = process.env.ADRIANA_EMAIL || 'adriana@segpopular.com',
  adriana_phone = process.env.ADRIANA_PHONE || '+593 987 770 788',
} = {}) {
  const b           = AGENT_BRANDING.ADRIANA;
  const firstName   = nombre ? nombre.split(' ')[0] : 'Cliente';
  const vehicleDesc = [marca, modelo, anio].filter(Boolean).join(' ') || 'Tu vehículo';
  const placaLabel  = placa ? ` · Placa: ${placa}` : '';
  const vazEncoded  = encodeURIComponent(`Hola Adriana, acepto la cotización VAZ para mi ${vehicleDesc}`);

  const competitorRows = competitors.length
    ? competitors.map((c, i) => `
      <tr class="comp${i}-row" style="background:${i % 2 === 0 ? '#f8fafc' : 'white'}">
        <td style="padding:12px 16px;font-size:13px;color:#374151;font-weight:600;">${c.nombre || `Competidor ${i + 1}`}</td>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:center;">${c.plan || '—'}</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#dc2626;text-align:center;">${c.prima_anual || '—'}</td>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:center;">${c.prima_mensual || '—'}</td>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:center;">${c.deducible || '—'}</td>
        <td style="padding:12px 16px;font-size:12px;text-align:center;">${c.asistencia || '—'}</td>
        <td style="padding:12px 16px;font-size:12px;text-align:center;">${c.amparo || '—'}</td>
      </tr>`).join('')
    : '';

  const competitorSection = competitors.length
    ? `
    <!-- Tabla competidores -->
    <div style="margin:24px 0;">
      <h3 style="font-size:15px;color:#1E3A8A;margin:0 0 12px;font-weight:700;">📊 Comparativa con la Competencia</h3>
      <div style="border-radius:10px;overflow:auto;border:1.5px solid #e5e7eb;">
        <table style="width:100%;border-collapse:collapse;min-width:560px;">
          <thead>
            <tr style="background:#1E3A8A;">
              <th style="padding:10px 16px;color:white;font-size:12px;text-align:left;">Aseguradora</th>
              <th style="padding:10px 16px;color:white;font-size:12px;text-align:center;">Plan</th>
              <th style="padding:10px 16px;color:#FCD34D;font-size:12px;text-align:center;">Prima Anual</th>
              <th style="padding:10px 16px;color:white;font-size:12px;text-align:center;">Mensual</th>
              <th style="padding:10px 16px;color:white;font-size:12px;text-align:center;">Deducible</th>
              <th style="padding:10px 16px;color:white;font-size:12px;text-align:center;">Asistencia</th>
              <th style="padding:10px 16px;color:white;font-size:12px;text-align:center;">Amparo</th>
            </tr>
          </thead>
          <tbody>${competitorRows}</tbody>
        </table>
      </div>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización VAZ Seguros — ${firstName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:${b.gradient};padding:40px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="color:rgba(255,255,255,0.8);font-size:11px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-bottom:14px;">${b.emoji} SEGPOPULAR · SEGUROS VAZ</div>
    <h1 style="color:#FCD34D;margin:0;font-size:26px;font-weight:900;line-height:1.2;">Hola ${firstName} 👋</h1>
    <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:15px;">Tu cotización personalizada está lista</p>
    <div style="margin-top:14px;background:rgba(255,255,255,0.15);display:inline-block;padding:5px 18px;border-radius:99px;color:rgba(255,255,255,0.9);font-size:12px;">${vehicleDesc}${placaLabel}</div>
  </div>

  <!-- Body -->
  <div style="background:white;padding:36px 32px;">

    <!-- Análisis del broker -->
    ${analisis_broker ? `
    <div style="background:#eff6ff;border-left:4px solid ${b.primaryColor};border-radius:0 10px 10px 0;padding:18px 20px;margin-bottom:24px;">
      <div style="font-size:12px;color:#1E3A8A;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">💬 Análisis de Adriana</div>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${analisis_broker}</p>
    </div>` : ''}

    <!-- VAZ — ganador -->
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #16a34a;border-radius:12px;padding:24px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <span class="badge-best" style="display:inline-block;background:#16a34a;color:white;padding:4px 14px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">✅ MEJOR OPCIÓN</span>
          <h2 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#1E3A8A;">VAZ Seguros · Plan Ensigna</h2>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Prima Anual</div>
          <div style="font-size:32px;font-weight:900;color:#16a34a;line-height:1;">${vaz_prima_anual || '—'}</div>
          ${vaz_prima_mensual ? `<div style="font-size:13px;color:#6b7280;">${vaz_prima_mensual}/mes</div>` : ''}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;">
        <tr>
          <td style="padding:6px 0;width:50%;">🔧 Deducible</td>
          <td style="padding:6px 0;font-weight:600;">${vaz_deducible}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;">🚐 Asistencia vial 24/7</td>
          <td style="padding:6px 0;font-weight:600;">✅ Ilimitada (grúa accidente)</td>
        </tr>
        <tr>
          <td style="padding:6px 0;">🏠 Amparo Patrimonial</td>
          <td style="padding:6px 0;font-weight:600;">✅ Incluido sin costo</td>
        </tr>
        <tr>
          <td style="padding:6px 0;">📋 Valor asegurado</td>
          <td style="padding:6px 0;font-weight:600;">${valor_asegurado}</td>
        </tr>
      </table>
    </div>

    ${competitorSection}

    <!-- CTA aceptar -->
    <div style="text-align:center;margin:28px 0 20px;">
      <a href="https://wa.me/${bot_phone}?text=${vazEncoded}"
         style="display:inline-block;background:#1E3A8A;color:#FCD34D;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:900;font-size:16px;box-shadow:0 4px 18px rgba(30,58,138,0.35);">
        ✅ ACEPTO — Quiero este seguro →
      </a>
      <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Responderé tu WhatsApp en minutos para coordinar la emisión</p>
    </div>

    <!-- Info footer -->
    <div style="background:#f9fafb;border-radius:10px;padding:14px 20px;font-size:12px;color:#6b7280;text-align:center;">
      ${valor_asegurado ? `Vehículo asegurado: <strong style="color:#374151;">${vehicleDesc}</strong> · Valor: <strong style="color:#374151;">${valor_asegurado}</strong><br>` : ''}
      ${nombre ? `Cliente: <strong style="color:#374151;">${nombre}</strong><br>` : ''}
      Cotización del ${fecha_cotizacion} · ${adriana_email} · ${adriana_phone}
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#1E3A8A;padding:28px 24px;text-align:center;border-radius:0 0 12px 12px;">
    <div style="color:#FCD34D;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;">🛡️ SegPopular Ecuador</div>
    <div style="color:rgba(255,255,255,0.75);font-size:12px;">Protegemos lo que más importa · Tu asesora: Adriana</div>
  </div>

</div>
</body>
</html>`;
}

// ─── DISPATCHER CENTRAL ──────────────────────────────────────────────────────

/**
 * 🚀 buildEmailTemplate — Wrapper central para todos los templates
 *
 * @param {string} agent  — 'ALUNA', 'AURORA', 'ADRIANA', 'ENZO', etc.
 * @param {string} type   — 'confirmation', 'rebooking', 'd1', 'd3', 'd7', 'comparison', etc.
 * @param {object} data   — Datos del template
 * @returns {string} HTML del email
 */
export function buildEmailTemplate(agent, type, data) {
  const key = `${agent.toUpperCase()}_${type.toUpperCase()}`;

  const builders = {
    ALUNA_D1:                 () => buildAlunaD1HTML(data),
    ALUNA_D3:                 () => buildAlunaD3HTML(data),
    AURORA_CONFIRMATION:      () => buildAuroraConfirmationHTML(data),
    AURORA_REBOOKING:         () => buildAuroraRebookingHTML(data),
    ENZO_D1:                  () => buildEnzoD1HTML(data),
    ENZO_D3:                  () => buildEnzoD3HTML(data),
    ENZO_D7:                  () => buildEnzoD7HTML(data),
    ADRIANA_COMPARISON:       () => buildAdrianaComparisonHTML(data),
    ADRIANA_COMPARISON_V2:    () => buildAdrianaComparisonV2HTML(data),
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
