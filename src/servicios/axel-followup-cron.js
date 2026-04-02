/**
 * ⏰ Axel Follow-up Cron Jobs
 * Recordatorios automáticos para cotizaciones sin respuesta
 *
 * HORARIOS (Ecuador UTC-5):
 * - D+2 (48h): 10:00 AM — "Hola {nombre}, ¿quedó alguna duda de la propuesta?"
 * - D+7 (7d):  11:00 AM — Segundo intento + descuento urgente
 */

import { CronJob } from 'cron';
import { findQuotesForReminder1, findQuotesForReminder2, markReminder1Sent, markReminder2Sent } from '../database/axelRepository.js';
import { enviarWhatsApp } from '../express-servidor/endpoints-api/wassenger.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.axel || console;

/**
 * Resolve the client's phone from quote fields.
 * `phone` = real client phone (filled from form data)
 * `user_phone` = WA session initiator (may be admin for boss quotes)
 */
function resolveClientPhone(quote) {
  return quote.phone || quote.user_phone || null;
}

/**
 * Check if a phone number belongs to the admin (Diego) — never send automated follow-ups there.
 */
function isAdminPhone(phone) {
  if (!phone) return false;
  const norm = phone.replace(/\D/g, '');
  const adminNorm = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
  const diegoNorm = (process.env.DIEGO_PERSONAL_PHONE || '').replace(/\D/g, '');
  return (adminNorm && norm === adminNorm) || (diegoNorm && norm === diegoNorm);
}

function buildD2Message(quote) {
  const name = (quote.client_name || 'Hola').split(' ')[0];
  const vehicle = [quote.vehicle_brand, quote.vehicle_model, quote.vehicle_year].filter(Boolean).join(' ') || 'tu vehículo';
  return [
    `@axel`,
    `Hola ${name} 👋`,
    ``,
    `¿Te quedó alguna duda de la propuesta de *${vehicle}*?`,
    ``,
    `Estoy disponible para revisarla juntos — 20 minutos y salimos con todo claro 🔧`,
    ``,
    `¿Cuándo te viene bien esta semana? 📅`
  ].join('\n');
}

function buildD7Message(quote) {
  const name = (quote.client_name || 'Hola').split(' ')[0];
  const vehicle = [quote.vehicle_brand, quote.vehicle_model, quote.vehicle_year].filter(Boolean).join(' ') || 'tu vehículo';
  const priceMin = quote.price_min ? `$${Math.round(quote.price_min)}` : null;
  const priceLine = priceMin ? `💰 Cotización: desde ${priceMin} USD` : '';
  return [
    `@axel`,
    `${name}, última vez que me comunicaba contigo sobre *${vehicle}* 🚗`,
    ``,
    priceLine,
    ``,
    `Si quieres avanzar, puedo darte *10% de descuento* si agendas esta semana. La oferta es válida solo 48h ⏰`,
    ``,
    `Responde *DESCUENTO* para reservar tu cita con el precio especial.`
  ].filter(l => l !== undefined).join('\n');
}

/**
 * 🚀 Inicia los cron jobs de follow-up Axel
 */
export function startAxelFollowupCronJobs() {

  // ⏰ D+2 (48h): Todos los días a las 10:00 AM Ecuador (15:00 UTC)
  const d2Job = new CronJob(
    '0 15 * * *',
    async function () {
      logger.info('[AXEL-CRON] ⏰ Ejecutando follow-up D+2...');
      try {
        const quotes = await findQuotesForReminder1();
        if (!quotes.length) {
          logger.info('[AXEL-CRON] ℹ️ No hay cotizaciones para D+2');
          return;
        }
        logger.info(`[AXEL-CRON] 📊 ${quotes.length} cotizaciones para D+2`);
        let sent = 0;
        for (const q of quotes) {
          try {
            const clientPhone = resolveClientPhone(q);
            if (!clientPhone) continue;
            if (isAdminPhone(clientPhone)) {
              logger.info(`[AXEL-CRON] ⏭️ Skipping D+2 for ${q.quote_code} — admin phone`);
              continue;
            }
            await enviarWhatsApp(clientPhone, buildD2Message(q));
            await markReminder1Sent(q.quote_code);
            sent++;
          } catch (err) {
            logger.error(`[AXEL-CRON] ⚠️ Error D+2 para ${q.quote_code}:`, err.message);
          }
        }
        logger.info(`[AXEL-CRON] ✅ D+2 completado: ${sent}/${quotes.length} enviados`);
      } catch (err) {
        logger.error('[AXEL-CRON] ❌ Error ejecutando D+2:', err);
      }
    },
    null, true, 'America/Guayaquil'
  );

  logger.info('[AXEL-CRON] ✅ Cron job D+2 configurado (10:00 AM Ecuador)');

  // 🔥 D+7: Todos los días a las 11:00 AM Ecuador (16:00 UTC)
  const d7Job = new CronJob(
    '0 16 * * *',
    async function () {
      logger.info('[AXEL-CRON] 🔥 Ejecutando follow-up D+7...');
      try {
        const quotes = await findQuotesForReminder2();
        if (!quotes.length) {
          logger.info('[AXEL-CRON] ℹ️ No hay cotizaciones para D+7');
          return;
        }
        logger.info(`[AXEL-CRON] 📊 ${quotes.length} cotizaciones para D+7`);
        let sent = 0;
        for (const q of quotes) {
          try {
            const clientPhone = resolveClientPhone(q);
            if (!clientPhone) continue;
            if (isAdminPhone(clientPhone)) {
              logger.info(`[AXEL-CRON] ⏭️ Skipping D+7 for ${q.quote_code} — admin phone`);
              continue;
            }
            await enviarWhatsApp(clientPhone, buildD7Message(q));
            await markReminder2Sent(q.quote_code);
            sent++;
          } catch (err) {
            logger.error(`[AXEL-CRON] ⚠️ Error D+7 para ${q.quote_code}:`, err.message);
          }
        }
        logger.info(`[AXEL-CRON] ✅ D+7 completado: ${sent}/${quotes.length} enviados`);
      } catch (err) {
        logger.error('[AXEL-CRON] ❌ Error ejecutando D+7:', err);
      }
    },
    null, true, 'America/Guayaquil'
  );

  logger.info('[AXEL-CRON] ✅ Cron job D+7 configurado (11:00 AM Ecuador)');
}
