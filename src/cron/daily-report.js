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
    const [aluna, aurora, adriana, selfHealing] = await Promise.all([
      collectAlunaStats(),
      collectAuroraStats(),
      collectAdrianaStats(),
      collectSelfHealingReport(),
    ]);

    await notifyDailyReport({ aluna, aurora, adriana, selfHealing });
    console.log('[DAILY-REPORT] ✅ Reporte enviado');
  } catch (err) {
    console.error('[DAILY-REPORT] ❌ Error enviando reporte:', err.message);
  }
}

async function collectSelfHealingReport() {
  try {
    await databaseService.ensureInitialized();

    // Obtener el reporte más reciente (de anoche)
    const latestReport = await databaseService.get(
      `SELECT report_date, errors_found, conversations_failed, plan_file, summary, status
       FROM self_healing_reports
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!latestReport) {
      return { hasReport: false };
    }

    // Solo incluir en el reporte si hay errores pendientes de revisión
    if (latestReport.status === 'pending' && (latestReport.errors_found > 0 || latestReport.conversations_failed > 0)) {
      return {
        hasReport: true,
        errorsFound: parseInt(latestReport.errors_found || 0),
        conversationsFailed: parseInt(latestReport.conversations_failed || 0),
        planFile: latestReport.plan_file || '',
        summary: latestReport.summary || ''
      };
    }

    return { hasReport: false };
  } catch (err) {
    console.warn('[DAILY-REPORT] ⚠️ Error obteniendo self-healing report:', err.message);
    return { hasReport: false };
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

// ─── Reporte semanal de métricas Aurora (negocio) ────────────────────────────

async function collectAuroraWeeklyStats() {
  try {
    await databaseService.ensureInitialized();

    const [
      totalWeek,
      confirmedWeek,
      byService,
      revenue,
      topDays,
    ] = await Promise.all([
      // Total reservas creadas esta semana
      databaseService.get(
        `SELECT COUNT(*) as count FROM reservations
         WHERE created_at >= NOW() - INTERVAL '7 days'`
      ),
      // Confirmadas (pagadas)
      databaseService.get(
        `SELECT COUNT(*) as count FROM reservations
         WHERE status IN ('confirmed','completed')
           AND created_at >= NOW() - INTERVAL '7 days'`
      ),
      // Por tipo de servicio
      databaseService.all(
        `SELECT service_type, COUNT(*) as count
         FROM reservations
         WHERE status IN ('confirmed','completed')
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY service_type ORDER BY count DESC`
      ),
      // Ingresos (total_price pagados)
      databaseService.get(
        `SELECT COALESCE(SUM(total_price),0) as total FROM reservations
         WHERE payment_status = 'paid'
           AND created_at >= NOW() - INTERVAL '7 days'`
      ),
      // Días con más reservas
      databaseService.all(
        `SELECT TO_CHAR(date::date, 'Dy DD/MM') as dia, COUNT(*) as count
         FROM reservations
         WHERE status IN ('confirmed','completed')
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY date ORDER BY count DESC LIMIT 3`
      ),
    ]);

    const serviceLabels = {
      hotDesk: 'Hot Desk',
      meetingRoom: 'Sala Reuniones',
      deskIndividual: 'Escritorio Indiv.',
    };

    return {
      total:     parseInt(totalWeek?.count     || 0),
      confirmed: parseInt(confirmedWeek?.count || 0),
      revenue:   parseFloat(revenue?.total     || 0),
      byService: (byService || []).map(r => ({
        name:  serviceLabels[r.service_type] || r.service_type,
        count: parseInt(r.count),
      })),
      topDays: (topDays || []).map(r => ({ dia: r.dia, count: parseInt(r.count) })),
    };
  } catch (err) {
    console.warn('[AURORA-WEEKLY] ⚠️ Error stats:', err.message);
    return { total: 0, confirmed: 0, revenue: 0, byService: [], topDays: [] };
  }
}

async function sendAuroraWeeklyMetrics() {
  console.log('[AURORA-WEEKLY] 📊 Generando métricas semanales Aurora...');
  try {
    const s = await collectAuroraWeeklyStats();
    const convRate = s.total > 0 ? Math.round((s.confirmed / s.total) * 100) : 0;

    const serviceLines = s.byService.length
      ? s.byService.map(b => `  · ${b.name}: *${b.count}*`).join('\n')
      : '  · Sin reservas confirmadas';

    const topDayLines = s.topDays.length
      ? s.topDays.map(d => `  · ${d.dia} — ${d.count} reserva${d.count !== 1 ? 's' : ''}`).join('\n')
      : '  · Sin datos';

    const msg = [
      '🏢 *Métricas Semanales Aurora*',
      `📅 Últimos 7 días`,
      '',
      `📥 Nuevas reservas: *${s.total}*`,
      `✅ Confirmadas/pagadas: *${s.confirmed}* (${convRate}%)`,
      `💰 Ingresos: *$${s.revenue.toFixed(2)}*`,
      '',
      '📊 *Por servicio:*',
      serviceLines,
      '',
      '📆 *Días más ocupados:*',
      topDayLines,
    ].join('\n');

    await notifyRaw(msg);
    console.log('[AURORA-WEEKLY] ✅ Métricas semanales enviadas');
  } catch (err) {
    console.error('[AURORA-WEEKLY] ❌ Error:', err.message);
  }
}

/**
 * Inicia el cron de métricas semanales de negocio de Aurora.
 * Ejecuta los viernes a las 18:00 hora Ecuador.
 */
export function startAuroraWeeklyMetricsCron() {
  const job = new CronJob(
    '0 0 18 * * 5',   // Viernes 18:00 Ecuador
    sendAuroraWeeklyMetrics,
    null,
    true,
    'America/Guayaquil'
  );
  console.log('[AURORA-WEEKLY] ✅ Cron métricas semanales Aurora configurado (viernes 18:00)');
  return job;
}

export { sendAuroraWeeklyMetrics };

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
