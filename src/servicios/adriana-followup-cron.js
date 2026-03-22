/**
 * ⏰ Adriana Follow-up Cron Jobs — Seguros Vehiculares
 *
 * HORARIOS (Ecuador, UTC-5):
 * - S1 D+1  → 10:00 AM: Recordatorio cálido
 * - S2 D+3  → 11:30 AM: FOMO + precio vence HOY
 * - S3 D+7  → 09:30 AM: Reconexión + cupón corporativo
 */

import { CronJob } from 'cron';
import { sendAdrianaS1Followups, sendAdrianaS2Followups, sendAdrianaS3Followups } from './adriana-followup-service.js';

export function startAdrianaFollowupCronJobs() {

  // S1 — D+1: Todos los días 10:00 AM ECT (15:00 UTC)
  new CronJob('0 15 * * *', async () => {
    console.log('[ADRIANA-CRON] ⏰ S1 D+1 disparando...');
    try {
      const { sent } = await sendAdrianaS1Followups();
      console.log(`[ADRIANA-CRON] ✅ S1 completado: ${sent} enviados`);
    } catch (err) {
      console.error('[ADRIANA-CRON] ❌ S1 error:', err.message);
    }
  }, null, true, 'America/Guayaquil');

  // S2 — D+3: Todos los días 11:30 AM ECT (16:30 UTC)
  new CronJob('30 16 * * *', async () => {
    console.log('[ADRIANA-CRON] ⏰ S2 D+3 disparando...');
    try {
      const { sent } = await sendAdrianaS2Followups();
      console.log(`[ADRIANA-CRON] ✅ S2 completado: ${sent} enviados`);
    } catch (err) {
      console.error('[ADRIANA-CRON] ❌ S2 error:', err.message);
    }
  }, null, true, 'America/Guayaquil');

  // S3 — D+7: Todos los días 09:30 AM ECT (14:30 UTC)
  new CronJob('30 14 * * *', async () => {
    console.log('[ADRIANA-CRON] ⏰ S3 D+7 disparando...');
    try {
      const { sent } = await sendAdrianaS3Followups();
      console.log(`[ADRIANA-CRON] ✅ S3 completado: ${sent} enviados`);
    } catch (err) {
      console.error('[ADRIANA-CRON] ❌ S3 error:', err.message);
    }
  }, null, true, 'America/Guayaquil');

  console.log('[ADRIANA-CRON] 🛡️ Follow-ups Adriana activos (S1: 10am, S2: 11:30am, S3: 9:30am ECT)');
}
