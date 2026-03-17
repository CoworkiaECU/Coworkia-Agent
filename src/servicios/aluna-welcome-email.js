/**
 * 🌙 ALUNA — Email de Bienvenida post-pago
 *
 * Se dispara DESPUÉS de que el pago es aprobado (automático o manual).
 * Enviado por Aluna (no Gabi — Gabi ya envió el recibo financiero).
 *
 * Contenido:
 *  1. Bienvenida personalizada
 *  2. Número de contrato (membership_code)
 *  3. Servicios y beneficios del plan contratado
 *  4. Credenciales WiFi para 3 dispositivos
 *  5. Próximos pasos operativos
 */

import { sendEmail } from './email.js';

// ─── Datos de planes ─────────────────────────────────────────────────────────
const PLAN_DETAILS = {
  'Plan 10': {
    price: '$140 USD/mes',
    dias: '10 días hábiles + 1 día de cortesía = 11 días',
    horario: 'Lunes a Viernes · 8:30 am → 7:00 pm',
    beneficios: [
      '🔒 Locker o cajonera privada con llave',
      '👥 2 invitados gratis por mes',
      '📋 2 usos de sala de reuniones por mes (hasta 4 personas)',
      '☕ WiFi ultrarrápido + café incluido todos los días',
      '🤖 Secretaria Virtual IA — Aluna (funciones por 9+ meses)'
    ]
  },
  'Plan 20': {
    price: '$250 USD/mes',
    dias: '20 días hábiles + 2 días de cortesía = 22 días',
    horario: 'Lunes a Viernes · 8:30 am → 7:00 pm',
    beneficios: [
      '🔒 Locker o cajonera privada con llave',
      '👥 4 invitados gratis por mes',
      '📋 4 usos de sala de reuniones por mes (hasta 4 personas)',
      '☕ WiFi ultrarrápido + café incluido todos los días',
      '🤖 Secretaria Virtual IA — Aluna (funciones por 9+ meses)'
    ]
  },
  'Plan 30': {
    price: '$310 USD/mes',
    dias: '30 días → acceso ilimitado todos los días hábiles del mes',
    horario: 'Lunes a Viernes · 8:30 am → 7:00 pm',
    beneficios: [
      '🔒 Locker o cajonera privada con llave',
      '👥 6 invitados gratis por mes',
      '📋 6 usos de sala de reuniones por mes (hasta 4 personas)',
      '☕ WiFi ultrarrápido + café incluido todos los días',
      '🤖 Secretaria Virtual IA — Aluna (funciones por 9+ meses)'
    ]
  },
  'Plan Full': {
    price: '$395 USD/mes',
    dias: 'Acceso ilimitado todos los días del mes incluyendo sábados',
    horario: 'Lunes a Sábado · 8:30 am → 7:00 pm',
    beneficios: [
      '🔒 Locker privado grande con llave',
      '👥 Invitados ilimitados',
      '📋 Usos de sala de reuniones ilimitados (hasta 4 personas)',
      '☕ WiFi ultrarrápido + café incluido todos los días',
      '🤖 Secretaria Virtual IA — Aluna (funciones por 9+ meses)',
      '🎁 1 sesión de sala de alto rendimiento/mes (8 personas)'
    ]
  },
  'Oficina Virtual': {
    price: '$365 USD/año',
    dias: 'Dirección comercial activa todo el año',
    horario: 'Cobertura permanente — 365 días',
    beneficios: [
      '📍 Dirección comercial oficial en Quito (Whymper 403)',
      '📬 Recepción y notificación de correspondencia',
      '🏛️ Cumplimiento legal SRI (comprobantes con dirección válida)',
      '📋 1 uso de sala de reuniones por mes incluido (2 horas)',
      '🏢 Ideal para empresas 100% remotas'
    ]
  }
};

// WiFi — 3 dispositivos por miembro (instrucciones operativas)
const WIFI_INFO = `
<div style="background:#0f172a;border:1px solid #1d4ed8;border-radius:12px;padding:20px;margin:20px 0;">
  <h3 style="color:#60a5fa;margin:0 0 12px;font-size:16px;">📡 Acceso a Internet — 3 Dispositivos</h3>
  <p style="color:#94a3b8;margin:0 0 12px;font-size:14px;">Tu plan incluye conexión estable y segura para <strong style="color:#f1f5f9;">3 dispositivos simultáneos</strong> durante todo el mes de tu membresía.</p>
  <table style="width:100%;font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="color:#64748b;padding:6px 0;width:40%;">Red WiFi:</td>
      <td style="color:#f1f5f9;font-weight:700;">Coworkia-Pro</td>
    </tr>
    <tr>
      <td style="color:#64748b;padding:6px 0;">Contraseña:</td>
      <td style="color:#f1f5f9;font-weight:700;">coworkia2024</td>
    </tr>
    <tr>
      <td style="color:#64748b;padding:6px 0;">Velocidad:</td>
      <td style="color:#f1f5f9;">300 Mbps fibra óptica</td>
    </tr>
    <tr>
      <td style="color:#64748b;padding:6px 0;">Dispositivos incluidos:</td>
      <td style="color:#34d399;font-weight:700;">3 simultáneos</td>
    </tr>
    <tr>
      <td style="color:#64748b;padding:6px 0;">Vigencia:</td>
      <td style="color:#f1f5f9;">Todo el mes de tu membresía</td>
    </tr>
  </table>
  <p style="color:#64748b;font-size:12px;margin:12px 0 0;">💡 Al llegar por primera vez, menciona tu código de contrato en recepción para que activen tus dispositivos.</p>
</div>
`.trim();

function buildWelcomeHTML({ memberName, membershipType, membershipCode, startDate, totalAmount, cashAmount, canjeAmount, canjeDescription }) {
  const plan = PLAN_DETAILS[membershipType] || PLAN_DETAILS['Plan 20'];

  const formatDate = (d) => new Date(d).toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const paymentLine = canjeAmount > 0
    ? `$${(cashAmount || 0).toFixed(2)} USD efectivo + $${canjeAmount.toFixed(2)} USD en canje de servicios`
    : `$${(totalAmount || 0).toFixed(2)} USD`;

  const benefitsHTML = plan.beneficios
    .map(b => `<li style="padding:6px 0;border-bottom:1px solid #1e293b;color:#cbd5e1;">${b}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bienvenida a Coworkia — ${membershipCode}</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:32px 0 24px;">
      <img src="https://coworkia-agent.herokuapp.com/assets/logos/coworkia-white.png"
           alt="Coworkia" style="height:48px;" onerror="this.style.display='none'">
      <h1 style="color:#f1f5f9;font-size:28px;margin:16px 0 4px;">¡Bienvenida a Coworkia!</h1>
      <p style="color:#64748b;font-size:14px;margin:0;">Tu espacio de trabajo ya está listo 🎉</p>
    </div>

    <!-- Saludo personalizado -->
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:16px;">
      <p style="color:#f1f5f9;font-size:16px;margin:0 0 12px;">Hola <strong>${memberName}</strong>,</p>
      <p style="color:#94a3b8;font-size:14px;margin:0;line-height:1.6;">
        Estamos felices de tenerte en nuestra comunidad. Tu membresía está confirmada y activa.
        A continuación encontrarás todo lo que necesitas saber para aprovechar al máximo tu plan.
      </p>
    </div>

    <!-- Número de contrato -->
    <div style="background:#0f172a;border:2px solid #3b82f6;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
      <p style="color:#60a5fa;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Número de Contrato</p>
      <p style="color:#f1f5f9;font-size:32px;font-weight:900;font-family:'Courier New',monospace;margin:0;letter-spacing:4px;">${membershipCode}</p>
      <p style="color:#64748b;font-size:12px;margin:8px 0 0;">Conserva este código — te lo pedirán en recepción</p>
    </div>

    <!-- Detalle del plan -->
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:16px;">
      <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 16px;">📋 ${membershipType} — Detalles</h2>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr>
          <td style="color:#64748b;padding:8px 0;width:40%;vertical-align:top;">Plan contratado:</td>
          <td style="color:#34d399;font-weight:700;padding:8px 0;">${membershipType}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:8px 0;vertical-align:top;">Días incluidos:</td>
          <td style="color:#f1f5f9;padding:8px 0;">${plan.dias}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:8px 0;vertical-align:top;">Horario de acceso:</td>
          <td style="color:#f1f5f9;padding:8px 0;">${plan.horario}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:8px 0;vertical-align:top;">Precio mensual:</td>
          <td style="color:#f1f5f9;padding:8px 0;">${plan.price}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:8px 0;vertical-align:top;">Inicio:</td>
          <td style="color:#f1f5f9;padding:8px 0;">${startDate ? formatDate(startDate) : 'Siguiente día hábil'}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:8px 0;vertical-align:top;">Pago realizado:</td>
          <td style="color:#f1f5f9;padding:8px 0;">${paymentLine}</td>
        </tr>
      </table>
    </div>

    <!-- Beneficios -->
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:16px;">
      <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 16px;">✨ Beneficios incluidos</h2>
      <ul style="list-style:none;padding:0;margin:0;">
        ${benefitsHTML}
      </ul>
    </div>

    <!-- WiFi -->
    ${WIFI_INFO}

    <!-- Próximos pasos -->
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:16px;">
      <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 16px;">🚀 Próximos pasos</h2>
      <ol style="padding:0 0 0 20px;margin:0;color:#94a3b8;font-size:14px;line-height:2;">
        <li>Preséntate en recepción con tu <strong style="color:#f1f5f9;">código de contrato: ${membershipCode}</strong></li>
        <li>Elige tu hot desk preferido (primer llegado, primer servido)</li>
        <li>Conecta tus dispositivos a la red <strong style="color:#f1f5f9;">Coworkia-Pro</strong></li>
        <li>Toma un café ☕ y empieza a producir</li>
      </ol>
    </div>

    <!-- Contacto -->
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">¿Tienes alguna duda? Estamos aquí para ti:</p>
      <p style="margin:4px 0;"><a href="https://wa.me/593994837117" style="color:#25d366;text-decoration:none;font-size:14px;">📱 WhatsApp: +593 99 483 7117</a></p>
      <p style="margin:4px 0;"><a href="mailto:secretaria.coworkia@gmail.com" style="color:#60a5fa;text-decoration:none;font-size:14px;">📧 secretaria.coworkia@gmail.com</a></p>
      <p style="color:#64748b;font-size:13px;margin:8px 0 0;">📍 Whymper 403, Edificio Finistere - Planta Baja, Quito</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-bottom:24px;">
      <p style="color:#334155;font-size:12px;margin:0;">
        © 2026 Coworkia Business Center · RUC: 1702683499001<br>
        Este email fue enviado por Aluna, tu asistente de membresías.
      </p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * 📧 Envía email de bienvenida de Aluna al nuevo miembro
 * @param {Object} lead       - Fila de membership_leads
 * @param {Object} payment    - Datos del pago (amount, etc.)
 * @param {Object} composite  - Pago compuesto {cashAmount, canjeAmount, canjeDescription} o null
 * @returns {Object}          - { success, messageId }
 */
export async function sendAlunaWelcomeEmail(lead, payment, composite = null) {
  if (!lead.email) {
    console.log('[ALUNA-WELCOME] ⚠️ Lead sin email — se omite correo de bienvenida');
    return { success: false, error: 'Sin email' };
  }

  console.log('[ALUNA-WELCOME] 🌙 Preparando email de bienvenida...');
  console.log('[ALUNA-WELCOME] - Cliente:', lead.full_name);
  console.log('[ALUNA-WELCOME] - Plan:', lead.membership_type);
  console.log('[ALUNA-WELCOME] - Contrato:', lead.membership_code);

  const htmlContent = buildWelcomeHTML({
    memberName:       lead.full_name,
    membershipType:   lead.membership_type,
    membershipCode:   lead.membership_code,
    startDate:        lead.start_date,
    totalAmount:      composite?.totalAmount ?? payment?.amount ?? 0,
    cashAmount:       composite?.cashAmount  ?? payment?.amount ?? 0,
    canjeAmount:      composite?.canjeAmount ?? 0,
    canjeDescription: composite?.canjeDescription ?? ''
  });

  const result = await sendEmail({
    from:    '"Aluna - Coworkia Membresías" <noreply@coworkia.ec>',
    to:      lead.email,
    cc:      'coworkia.ec@gmail.com',
    subject: `🎉 ¡Bienvenida a Coworkia, ${lead.full_name}! — Tu ${lead.membership_type} está activa · ${lead.membership_code}`,
    html:    htmlContent
  });

  if (result.success) {
    console.log('[ALUNA-WELCOME] ✅ Email de bienvenida enviado:', result.messageId);
  } else {
    console.error('[ALUNA-WELCOME] ❌ Error enviando bienvenida:', result.error);
  }

  return result;
}
