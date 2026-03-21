/**
 * ⏰ Aurora + Enzo Follow-up Cron Jobs
 * 
 * HORARIOS (Ecuador UTC-5, usar UTC en cron):
 * Aurora:
 *   - Cada 15 min: +1h post-reserva (verificación frecuente)
 *   - 10:00 AM:    D+7 rebooking reminder
 * Enzo:
 *   - 11:00 AM:    D+1 follow-up (recordatorio amigable)
 *   - 14:00 PM:    D+3 follow-up (FOMO + 15% OFF)
 *   - 10:30 AM:    D+7 follow-up (caso de éxito)
 */

import { CronJob } from 'cron';
import { sendOneHourFollowups, sendRebookingReminders } from './aurora-followup-service.js';
import { sendEnzoD1Followups, sendEnzoD3Followups, sendEnzoD7Followups } from './enzo-followup-service.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.aurora || console;

export function startAuroraEnzoCronJobs() {

  // ─── AURORA: +1h post-reserva (cada 15 min) ───────────────────
  const aurora1hJob = new CronJob(
    '*/15 * * * *',
    async function () {
      logger.info('[CRON-AURORA] ⏰ Verificando follow-ups +1h...');
      try {
        const result = await sendOneHourFollowups();
        if (result.success && result.sent > 0) {
          logger.info(`[CRON-AURORA] ✅ +1h: ${result.sent} enviados`);
        }
      } catch (err) {
        logger.error('[CRON-AURORA] ❌ Error +1h:', err);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );

  logger.info('[CRON] ✅ Aurora +1h configurado (cada 15 min)');

  // ─── AURORA: D+7 rebooking (10:00 AM Ecuador = 15:00 UTC) ────────
  const auroraRebookJob = new CronJob(
    '0 15 * * *',
    async function () {
      logger.info('[CRON-AURORA] 📅 Ejecutando rebooking D+7...');
      try {
        const result = await sendRebookingReminders();
        if (result.success) {
          logger.info(`[CRON-AURORA] ✅ Rebooking: ${result.sent} enviados`);
        }
      } catch (err) {
        logger.error('[CRON-AURORA] ❌ Error rebooking:', err);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );

  logger.info('[CRON] ✅ Aurora rebooking D+7 configurado (10:00 AM Ecuador)');

  // ─── ENZO: D+1 (11:00 AM Ecuador = 16:00 UTC) ─────────────────
  const enzoD1Job = new CronJob(
    '0 16 * * *',
    async function () {
      logger.info('[CRON-ENZO] 📬 Ejecutando D+1 follow-up...');
      try {
        const result = await sendEnzoD1Followups();
        if (result.success) {
          logger.info(`[CRON-ENZO] ✅ D+1: ${result.sent} enviados, ${result.errors} errores`);
        }
      } catch (err) {
        logger.error('[CRON-ENZO] ❌ Error D+1:', err);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );

  logger.info('[CRON] ✅ Enzo D+1 configurado (11:00 AM Ecuador)');

  // ─── ENZO: D+3 (14:00 Ecuador = 19:00 UTC) ────────────────────
  const enzoD3Job = new CronJob(
    '0 19 * * *',
    async function () {
      logger.info('[CRON-ENZO] 🔥 Ejecutando D+3 FOMO follow-up...');
      try {
        const result = await sendEnzoD3Followups();
        if (result.success) {
          logger.info(`[CRON-ENZO] ✅ D+3: ${result.sent} enviados, ${result.errors} errores`);
        }
      } catch (err) {
        logger.error('[CRON-ENZO] ❌ Error D+3:', err);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );

  logger.info('[CRON] ✅ Enzo D+3 configurado (14:00 PM Ecuador)');

  // ─── ENZO: D+7 (10:30 AM Ecuador = 15:30 UTC) ─────────────────
  const enzoD7Job = new CronJob(
    '30 15 * * *',
    async function () {
      logger.info('[CRON-ENZO] 🏆 Ejecutando D+7 caso-éxito follow-up...');
      try {
        const result = await sendEnzoD7Followups();
        if (result.success) {
          logger.info(`[CRON-ENZO] ✅ D+7: ${result.sent} enviados, ${result.errors} errores`);
        }
      } catch (err) {
        logger.error('[CRON-ENZO] ❌ Error D+7:', err);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );

  logger.info('[CRON] ✅ Enzo D+7 configurado (10:30 AM Ecuador)');
  logger.info('[CRON] 🚀 Aurora + Enzo follow-up crons activos (5 jobs)');

  return { aurora1hJob, auroraRebookJob, enzoD1Job, enzoD3Job, enzoD7Job };
}
