/**
 * ⏰ Paula Follow-up Cron Jobs — PropElite Bienes Raíces
 *
 * HORARIOS (Ecuador, UTC-5):
 * - 24h post-brochure → 10:00 AM: "¿Pudiste revisar el brochure?"
 * - 3d sin respuesta   → 11:00 AM: "Tengo opciones nuevas"
 * - Reminder visita     → 08:00 AM: "Mañana es tu visita"
 */

import { CronJob } from 'cron';
import { processPaulaFollowUps } from './paula-followup-service.js';

export function startPaulaFollowupCronJobs() {

  // 24h post-brochure — Todos los días 10:00 AM ECT (15:00 UTC)
  new CronJob('0 15 * * *', async () => {
    console.log('[PAULA-CRON] ⏰ Follow-ups disparando (10am ECT)...');
    try {
      const results = await processPaulaFollowUps();
      console.log(`[PAULA-CRON] ✅ Completado: 24h=${results.sent24h}, 3d=${results.sent3d}, reminders=${results.visitReminders}, skipped=${results.skipped}`);
    } catch (err) {
      console.error('[PAULA-CRON] ❌ Error:', err.message);
    }
  }, null, true, 'America/Guayaquil');

  console.log('[PAULA-CRON] 🏡 Follow-ups Paula activos (24h: 10am, 3d: 10am, reminder: 10am ECT)');
}
