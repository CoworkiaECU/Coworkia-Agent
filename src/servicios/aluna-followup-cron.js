/**
 * ⏰ Aluna Follow-up Cron Jobs
 * Ejecuta automáticamente follow-ups D+1 y D+3 todos los días
 * 
 * HORARIOS (Ecuador UTC-5):
 * - 10:00 AM: Follow-up D+1 (24 horas)
 * - 11:00 AM: Follow-up D+3 (3 días FOMO)
 */

import { CronJob } from 'cron';
import { sendD1Followups, sendD3Followups, getFollowupStats } from './aluna-followup-service.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.aluna || console;

/**
 * 🚀 Inicia todos los cron jobs de follow-ups
 */
export function startFollowupCronJobs() {
  
  // ⏰ D+1 Follow-up: Todos los días a las 10:00 AM Ecuador (15:00 UTC)
  const d1Job = new CronJob(
    '0 15 * * *', // At 15:00 UTC (10:00 AM Ecuador)
    async function() {
      logger.info('[CRON] ⏰ Ejecutando follow-up D+1 automático...');
      
      try {
        const result = await sendD1Followups();
        
        if (result.success) {
          logger.info(`[CRON] ✅ D+1 completado: ${result.sent} enviados, ${result.errors} errores`);
        } else {
          logger.error(`[CRON] ❌ D+1 falló: ${result.error}`);
        }
        
      } catch (error) {
        logger.error('[CRON] ❌ Error ejecutando D+1:', error);
      }
    },
    null, // onComplete
    true, // start
    'America/Guayaquil' // timezone
  );
  
  logger.info('[CRON] ✅ Cron job D+1 configurado (10:00 AM Ecuador)');
  
  
  // 🔥 D+3 Follow-up: Todos los días a las 11:00 AM Ecuador (16:00 UTC)
  const d3Job = new CronJob(
    '0 16 * * *', // At 16:00 UTC (11:00 AM Ecuador)
    async function() {
      logger.info('[CRON] 🔥 Ejecutando follow-up D+3 FOMO automático...');
      
      try {
        const result = await sendD3Followups();
        
        if (result.success) {
          logger.info(`[CRON] ✅ D+3 completado: ${result.sent} enviados, ${result.errors} errores`);
        } else {
          logger.error(`[CRON] ❌ D+3 falló: ${result.error}`);
        }
        
      } catch (error) {
        logger.error('[CRON] ❌ Error ejecutando D+3:', error);
      }
    },
    null, // onComplete
    true, // start
    'America/Guayaquil' // timezone
  );
  
  logger.info('[CRON] ✅ Cron job D+3 configurado (11:00 AM Ecuador)');
  
  
  // 📊 Stats diarios: Todos los días a las 9:00 AM Ecuador (14:00 UTC)
  const statsJob = new CronJob(
    '0 14 * * *', // At 14:00 UTC (9:00 AM Ecuador)
    async function() {
      logger.info('[CRON] 📊 Generando stats diarios de follow-ups...');
      
      try {
        const stats = await getFollowupStats(7); // Últimos 7 días
        
        if (stats) {
          logger.info('[CRON] 📊 Stats últimos 7 días:', {
            total_leads: stats.total_leads,
            d1_sent: stats.d1_sent,
            d3_sent: stats.d3_sent,
            responded: stats.responded,
            conversion_rate: `${Math.round((stats.responded / stats.total_leads) * 100)}%`
          });
        }
        
      } catch (error) {
        logger.error('[CRON] ❌ Error generando stats:', error);
      }
    },
    null, // onComplete
    true, // start
    'America/Guayaquil' // timezone
  );
  
  logger.info('[CRON] ✅ Cron job de stats configurado (9:00 AM Ecuador)');
  
  logger.info('[CRON] 🚀 Todos los cron jobs de Aluna iniciados exitosamente');
  
  return { d1Job, d3Job, statsJob };
}

/**
 * 🧪 Ejecuta follow-ups manualmente (para testing)
 */
export async function runFollowupsManual(type = 'both') {
  logger.info(`[MANUAL] 🧪 Ejecutando follow-ups manuales: ${type}`);
  
  const results = {};
  
  if (type === 'd1' || type === 'both') {
    results.d1 = await sendD1Followups();
  }
  
  if (type === 'd3' || type === 'both') {
    results.d3 = await sendD3Followups();
  }
  
  return results;
}
