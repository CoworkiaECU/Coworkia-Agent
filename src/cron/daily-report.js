/**
 * 📊 daily-report.js — Reporte diario automático a Diego (9:00 AM Ecuador)
 *
 * Ejecuta cada día a las 09:00 hora Ecuador (= 14:00 UTC).
 * Consulta stats de Aluna, Aurora y Adriana directamente en BD
 * y envía resumen por WhatsApp vía notification-service.
 *
 * Uso: startDailyReportCron() desde index.js en el boot.
 */

import { CronJob }           from 'cron';
import { notifyDailyReport, notifyRaw } from '../servicios/notification-service.js';
import databaseService       from '../database/database.js';
import { metricsCollector }  from '../utils/observability.js';

// ─── Recolección de stats ─────────────────────────────────────────────────────

async function collectAlunaStats() {
  try {
    await databaseService.ensureInitialized();

    const [newToday, followups, conversions] = await Promise.all([
      databaseService.get(
        `SELECT COUNT(*) as count FROM aluna_prospect_followups
         WHERE DATE(interest_at AT TIME ZONE 'America/Guayaquil') = CURRENT_DATE`
      ),
      databaseService.get(
        `SELECT COUNT(*) as count FROM aluna_prospect_followups
         WHERE (followup_24h_sent_at IS NOT NULL OR followup_3d_sent_at IS NOT NULL)
           AND DATE(GREATEST(COALESCE(followup_24h_sent_at, '1970-01-01'), COALESCE(followup_3d_sent_at, '1970-01-01')) AT TIME ZONE 'America/Guayaquil') = CURRENT_DATE`
      ),
      databaseService.get(
        `SELECT COUNT(*) as count FROM aluna_prospect_followups
         WHERE DATE(converted_at AT TIME ZONE 'America/Guayaquil') = CURRENT_DATE`
      ),
    ]);

    return {
      newToday:      parseInt(newToday?.count     || 0),
      followupsSent: parseInt(followups?.count    || 0),
      conversions:   parseInt(conversions?.count  || 0),
    };
  } catch (err) {
    console.warn('[DAILY-REPORT] ⚠️ Error stats Aluna:', err.message);
    return { newToday: 0, followupsSent: 0, conversions: 0 };
  }
}

async function collectAuroraStats() {
  try {
    await databaseService.ensureInitialized();

    const [todayReservations, pending] = await Promise.all([
      databaseService.get(
        `SELECT COUNT(*) as count FROM reservations
         WHERE DATE(created_at AT TIME ZONE 'America/Guayaquil') = CURRENT_DATE`
      ),
      databaseService.get(
        `SELECT COUNT(*) as count FROM pending_confirmations
         WHERE status = 'pending'`
      ),
    ]);

    return {
      todayReservations:    parseInt(todayReservations?.count || 0),
      pendingConfirmations: parseInt(pending?.count          || 0),
    };
  } catch (err) {
    console.warn('[DAILY-REPORT] ⚠️ Error stats Aurora:', err.message);
    return { todayReservations: 0, pendingConfirmations: 0 };
  }
}

async function collectAdrianaStats() {
  try {
    await databaseService.ensureInitialized();

    const [newToday, accepted] = await Promise.all([
      databaseService.get(
        `SELECT COUNT(*) as count FROM insurance_leads
         WHERE DATE(created_at AT TIME ZONE 'America/Guayaquil') = CURRENT_DATE`
      ),
      databaseService.get(
        `SELECT COUNT(*) as count FROM insurance_leads
         WHERE status = 'accepted'
           AND DATE(created_at AT TIME ZONE 'America/Guayaquil') = CURRENT_DATE`
      ),
    ]);

    return {
      newToday: parseInt(newToday?.count || 0),
      accepted: parseInt(accepted?.count || 0),
    };
  } catch (err) {
    console.warn('[DAILY-REPORT] ⚠️ Error stats Adriana:', err.message);
    return { newToday: 0, accepted: 0 };
  }
}

// ─── Job ──────────────────────────────────────────────────────────────────────

async function sendDailyReport() {
  console.log('[DAILY-REPORT] 📊 Generando reporte diario...');
  try {
    const [aluna, aurora, adriana] = await Promise.all([
      collectAlunaStats(),
      collectAuroraStats(),
      collectAdrianaStats(),
    ]);

    await notifyDailyReport({ aluna, aurora, adriana });
    console.log('[DAILY-REPORT] ✅ Reporte enviado');
  } catch (err) {
    console.error('[DAILY-REPORT] ❌ Error enviando reporte:', err.message);
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia el cron de reporte diario.
 * Ejecuta a las 09:00 hora Ecuador todos los días.
 */
export function startDailyReportCron() {
  // 09:00 AM Ecuador = 14:00 UTC
  // Expresión: segundos minutos horas día mes díaSemana
  const job = new CronJob(
    '0 0 9 * * *',
    sendDailyReport,
    null,
    true,            // start immediately
    'America/Guayaquil'
  );

  console.log('[DAILY-REPORT] ✅ Cron de reporte diario configurado (09:00 AM Ecuador)');
  return job;
}

// Exportar también la función para testing / ejecución manual
export { sendDailyReport };

// ─── Reporte semanal de performance ──────────────────────────────────────────

async function sendWeeklyPerfReport() {
  try {
    const snap = metricsCollector.getMetrics ? metricsCollector.getMetrics() : null;
    if (!snap) {
      console.log('[WEEKLY-PERF] metricsCollector sin snapshot disponible');
      return;
    }

    const lines = [
      '📊 *Reporte Semanal de Performance*',
      '',
      `🔢 Requests totales: ${snap.requests?.total ?? 'N/A'}`,
      `✅ Exitosos: ${snap.requests?.success ?? 'N/A'}`,
      `❌ Fallidos: ${snap.requests?.failed ?? 'N/A'}`,
      `⏱️ Avg response time: ${snap.requests?.avgResponseTime ? snap.requests.avgResponseTime.toFixed(0) + 'ms' : 'N/A'}`,
      '',
      `🗄️ Queries totales: ${snap.database?.queriesTotal ?? 'N/A'}`,
      `🐢 Queries lentas (+500ms): ${snap.database?.slowQueries ?? 'N/A'}`,
      `⏱️ Avg query time: ${snap.database?.avgQueryTime ? snap.database.avgQueryTime.toFixed(0) + 'ms' : 'N/A'}`,
      '',
      `💾 RAM actual: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      `🕐 Período: últimos 7 días`
    ];

    await notifyRaw(lines.join('\n'));
    console.log('[WEEKLY-PERF] ✅ Reporte semanal enviado');
  } catch (err) {
    console.error('[WEEKLY-PERF] ❌ Error:', err.message);
  }
}

/**
 * Inicia el cron de reporte semanal de performance.
 * Ejecuta los lunes a las 09:00 hora Ecuador.
 */
export function startWeeklyPerfReportCron() {
  const job = new CronJob(
    '0 0 9 * * 1',   // Lunes 09:00
    sendWeeklyPerfReport,
    null,
    true,
    'America/Guayaquil'
  );
  console.log('[WEEKLY-PERF] ✅ Cron de reporte semanal configurado (lunes 09:00 Ecuador)');
  return job;
}

export { sendWeeklyPerfReport };
