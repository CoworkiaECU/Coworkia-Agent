/**
 * 🚀 Enzo Follow-up Service — MarketingLab
 * Automatización de seguimientos post-propuesta
 *
 * FLUJO:
 * - D+1 (24h): Recordatorio amigable sin presión
 * - D+3 (72h): FOMO + descuento 15% "solo por hoy"
 * - D+7 (7 días): Último intento + caso de éxito
 *
 * CRON JOBS (en index.js):
 * - 11:00 AM ECT: D+1 followup
 * - 14:00 PM ECT: D+3 followup
 * - 10:30 AM ECT: D+7 followup
 */

import { enviarWhatsApp } from '../express-servidor/endpoints-api/wassenger.js';
import { sendEmail } from '../servicios/email.js';
import { normalizePhoneEC } from '../utils/validators.js';
import {
  findLeadsForEnzoD1Followup,
  findLeadsForEnzoD3Followup,
  findLeadsForEnzoD7Followup,
  markEnzoFollowupSent
} from '../database/enzoRepository.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.enzo || console;

const ML_CC = process.env.COWORKIA_ADMIN_EMAIL || 'coworkia.ec@gmail.com';

/**
 * Resolve client phone for WA follow-up.
 * `phone` = real client phone (from boss quote parsing).
 * `user_phone` = WA session initiator (admin for boss quotes).
 * Normalize to +593 format.
 */
function resolveClientPhone(lead) {
  const raw = lead.phone || lead.user_phone || null;
  return normalizePhoneEC(raw);
}

/**
 * Check if phone belongs to admin — never send automated follow-ups there.
 */
function isAdminPhone(phone) {
  if (!phone) return false;
  const norm = (phone || '').replace(/\D/g, '');
  const adminNorm = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
  const diegoNorm = (process.env.DIEGO_PERSONAL_PHONE || '').replace(/\D/g, '');
  return (adminNorm && norm === adminNorm) || (diegoNorm && norm === diegoNorm);
}

// ─────────────────────────────────────────────────────────────
// D+1: RECORDATORIO AMIGABLE
// ─────────────────────────────────────────────────────────────

export async function sendEnzoD1Followups() {
  logger.info('[ENZO-FOLLOWUP] 📅 Iniciando D+1...');

  try {
    const leads = await findLeadsForEnzoD1Followup();

    if (!leads || leads.length === 0) {
      logger.info('[ENZO-FOLLOWUP] ℹ️ Sin leads para D+1');
      return { success: true, sent: 0 };
    }

    let sent = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        // WhatsApp si tiene número del cliente
        const clientPhone = resolveClientPhone(lead);
        if (clientPhone && !isAdminPhone(clientPhone)) {
          await enviarWhatsApp(clientPhone, buildD1WhatsApp(lead));
        }

        // Email si tiene
        if (lead.email) {
          await sendEmail({
            to: lead.email,
            cc: ML_CC,
            subject: `${lead.client_name || 'Hola'}, ¿seguimos adelante con tu estrategia digital?`,
            html: buildD1EmailHTML(lead)
          });
        }

        await markEnzoFollowupSent(lead.id, 'd1');
        sent++;

        logger.info(`[ENZO-FOLLOWUP] ✅ D+1 enviado: ${lead.client_name} (${lead.project_code})`);
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        errors++;
        logger.error(`[ENZO-FOLLOWUP] ❌ Error D+1 (${lead.project_code}):`, err);
      }
    }

    logger.info(`[ENZO-FOLLOWUP] D+1 completado: ${sent} enviados, ${errors} errores`);
    return { success: true, sent, errors };

  } catch (err) {
    logger.error('[ENZO-FOLLOWUP] ❌ Error general D+1:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// D+3: FOMO + DESCUENTO 15%
// ─────────────────────────────────────────────────────────────

export async function sendEnzoD3Followups() {
  logger.info('[ENZO-FOLLOWUP] 📅 Iniciando D+3...');

  try {
    const leads = await findLeadsForEnzoD3Followup();

    if (!leads || leads.length === 0) {
      logger.info('[ENZO-FOLLOWUP] ℹ️ Sin leads para D+3');
      return { success: true, sent: 0 };
    }

    let sent = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const clientPhone = resolveClientPhone(lead);
        if (clientPhone && !isAdminPhone(clientPhone)) {
          await enviarWhatsApp(clientPhone, buildD3WhatsApp(lead));
        }

        if (lead.email) {
          await sendEmail({
            to: lead.email,
            cc: ML_CC,
            subject: `🎁 Oferta especial para ${lead.client_name || 'ti'}: 15% OFF — Solo hoy`,
            html: buildD3EmailHTML(lead)
          });
        }

        await markEnzoFollowupSent(lead.id, 'd3');
        sent++;

        logger.info(`[ENZO-FOLLOWUP] ✅ D+3 enviado: ${lead.client_name} (${lead.project_code})`);
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        errors++;
        logger.error(`[ENZO-FOLLOWUP] ❌ Error D+3 (${lead.project_code}):`, err);
      }
    }

    logger.info(`[ENZO-FOLLOWUP] D+3 completado: ${sent} enviados, ${errors} errores`);
    return { success: true, sent, errors };

  } catch (err) {
    logger.error('[ENZO-FOLLOWUP] ❌ Error general D+3:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// D+7: ÚLTIMO INTENTO + CASO DE ÉXITO
// ─────────────────────────────────────────────────────────────

export async function sendEnzoD7Followups() {
  logger.info('[ENZO-FOLLOWUP] 📅 Iniciando D+7...');

  try {
    const leads = await findLeadsForEnzoD7Followup();

    if (!leads || leads.length === 0) {
      logger.info('[ENZO-FOLLOWUP] ℹ️ Sin leads para D+7');
      return { success: true, sent: 0 };
    }

    let sent = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const clientPhone = resolveClientPhone(lead);
        if (clientPhone && !isAdminPhone(clientPhone)) {
          await enviarWhatsApp(clientPhone, buildD7WhatsApp(lead));
        }

        if (lead.email) {
          await sendEmail({
            to: lead.email,
            cc: ML_CC,
            subject: `Cómo ayudamos a una empresa a crecer 300% en 3 meses 📈`,
            html: buildD7EmailHTML(lead)
          });
        }

        await markEnzoFollowupSent(lead.id, 'd7');
        sent++;

        logger.info(`[ENZO-FOLLOWUP] ✅ D+7 enviado: ${lead.client_name} (${lead.project_code})`);
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        errors++;
        logger.error(`[ENZO-FOLLOWUP] ❌ Error D+7 (${lead.project_code}):`, err);
      }
    }

    logger.info(`[ENZO-FOLLOWUP] D+7 completado: ${sent} enviados, ${errors} errores`);
    return { success: true, sent, errors };

  } catch (err) {
    logger.error('[ENZO-FOLLOWUP] ❌ Error general D+7:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES WHATSAPP
// ─────────────────────────────────────────────────────────────

function buildD1WhatsApp(lead) {
  const nombre = lead.client_name?.split(' ')[0] || 'Hola';
  const tipo = lead.project_type || 'proyecto';
  return (
    `Hola ${nombre} 👋\n\n` +
    `Quería hacer seguimiento de tu *${tipo}* con MarketingLab.\n\n` +
    `¿Tienes alguna pregunta sobre la propuesta? Estoy aquí para ayudarte.\n\n` +
    `_Enzo — MarketingLab_`
  );
}

function buildD3WhatsApp(lead) {
  const nombre = lead.client_name?.split(' ')[0] || '';
  return (
    `${nombre ? nombre + ', ' : ''}tenemos una oferta especial *SOLO HOY*:\n\n` +
    `🎁 *15% de descuento* en tu primer proyecto con MarketingLab.\n\n` +
    `Esta oferta vence hoy a las 23:59. ¿Te interesa?\n\n` +
    `Responde *SI* y te mando los detalles al instante 🚀`
  );
}

function buildD7WhatsApp(lead) {
  const nombre = lead.client_name?.split(' ')[0] || '';
  return (
    `${nombre ? nombre + ', ' : ''}¿sabías que una empresa similar a la tuya creció *300% en 3 meses* con nuestra estrategia digital? 📈\n\n` +
    `Me encantaría contarte cómo lo logramos y si podría funcionar para ti.\n\n` +
    `¿Tienes 15 minutos esta semana para una llamada rápida?`
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES EMAIL HTML
// ─────────────────────────────────────────────────────────────

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background-color: #F97316; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 32px 40px; text-align: center; }
    .header img { height: 48px; }
    .header h1 { color: white; margin: 12px 0 0; font-size: 22px; font-weight: 700; }
    .body { padding: 40px; color: #1f2937; line-height: 1.7; }
    .body p { margin: 0 0 16px; }
    .cta-btn { display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 8px 0; }
    .footer { background: #f9f9f9; padding: 24px 40px; text-align: center; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
    .badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    @media(prefers-color-scheme:dark){body{background-color:#f3f4f6!important}.container{background-color:#fff!important;color:#1f2937!important}}
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>MarketingLab</h1>
    <p style="color:rgba(255,255,255,0.85); margin:4px 0 0; font-size:14px;">Estrategia Digital & Crecimiento</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">MarketingLab Ecuador · <a href="mailto:enzo@marketinglab.ec" style="color:#F97316;">enzo@marketinglab.ec</a></div>
</div>
</body>
</html>`;
}

function buildD1EmailHTML(lead) {
  const nombre = lead.client_name?.split(' ')[0] || 'estimado cliente';
  const tipo = lead.project_type || 'proyecto';

  return emailWrapper(`
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Quería hacer un seguimiento sobre tu <strong>${tipo}</strong> con MarketingLab.</p>
    <p>¿Tienes alguna pregunta sobre la propuesta que te enviamos? Estamos disponibles para resolver cualquier duda y adaptar el plan a tus necesidades.</p>
    <p>¿Seguimos adelante?</p>
    <a href="https://wa.me/593994837117" class="cta-btn">💬 Hablar con Enzo</a>
    <p style="margin-top:24px; color:#6b7280; font-size:14px;">Un saludo,<br><strong>Enzo · MarketingLab</strong></p>
  `);
}

function buildD3EmailHTML(lead) {
  const nombre = lead.client_name?.split(' ')[0] || 'estimado cliente';
  const descuento = Math.round((lead.proposal_amount || 0) * 0.15);

  return emailWrapper(`
    <p>Hola <strong>${nombre}</strong>,</p>
    <div class="badge">🎁 Oferta especial — Válida solo hoy</div>
    <p style="margin-top:16px;">Queremos que tu proyecto despegue, y para ayudarte a dar el primer paso, tenemos una propuesta especial:</p>
    <p style="font-size:20px; font-weight:700; color:#F97316;">15% de descuento${descuento > 0 ? ` (ahorra $${descuento})` : ''} en tu primer proyecto</p>
    <p>Esta oferta vence hoy a las 23:59. No la dejes pasar.</p>
    <a href="https://wa.me/593994837117" class="cta-btn">🚀 Quiero mi descuento</a>
    <p style="margin-top:24px; color:#6b7280; font-size:14px;">Un saludo,<br><strong>Enzo · MarketingLab</strong></p>
  `);
}

function buildD7EmailHTML(lead) {
  const nombre = lead.client_name?.split(' ')[0] || 'estimado cliente';

  return emailWrapper(`
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Quiero compartirte algo que creo que te va a interesar.</p>
    <p>Una empresa del sector <em>${lead.project_type || 'retail'}</em> similar a la tuya contrató nuestra estrategia de marketing digital hace 3 meses.</p>
    <p style="font-size:18px; font-weight:700; color:#F97316;">Resultado: crecimiento del 300% en leads calificados.</p>
    <p>¿Te gustaría ver cómo lo logramos y si este enfoque podría funcionar para tu negocio?</p>
    <a href="https://wa.me/593994837117" class="cta-btn">📞 Ver caso de éxito</a>
    <p style="margin-top:24px; color:#6b7280; font-size:14px;">Un saludo,<br><strong>Enzo · MarketingLab</strong></p>
  `);
}
