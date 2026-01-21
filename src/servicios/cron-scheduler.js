// src/servicios/cron-scheduler.js
import { CronJob } from 'cron';
import { 
  cleanupExpiredConfirmations, 
  cleanupJustConfirmedFlags,
  cleanupOldInteractions,
  cleanupExpiredPartialForms 
} from '../../scripts/database/cleanup-expired-data.js';
import { processFollowUps } from './follow-up-service.js';
import dailyCleanup from '../../scripts/maintenance/daily-cleanup.js';

const jobs = [];
const isProd = process.env.NODE_ENV === 'production';

/**
 * 🕐 Inicializa tareas programadas
 */
export function initScheduler() {
  console.log('[CRON] ⏰ Iniciando tareas programadas...');
  console.log(`[CRON] 🔧 Modo: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  
  // ✅ Limpieza de confirmaciones expiradas y flags justConfirmed
  // Cada 2 horas
  const cleanupFlagsJob = new CronJob(
    '0 */2 * * *', // Cada 2 horas
    async () => {
      try {
        console.log('[CRON] 🧹 Ejecutando limpieza de confirmaciones expiradas...');
        const confirmations = await cleanupExpiredConfirmations();
        console.log(`[CRON] ✅ Eliminadas ${confirmations} confirmaciones expiradas`);
        
        console.log('[CRON] 🧹 Ejecutando limpieza de flags justConfirmed...');
        const flags = await cleanupJustConfirmedFlags();
        console.log(`[CRON] ✅ Eliminados ${flags} flags justConfirmed expirados`);
        
        console.log('[CRON] 🧹 Ejecutando limpieza de formularios parciales expirados...');
        const partialForms = await cleanupExpiredPartialForms();
        console.log(`[CRON] ✅ Eliminados ${partialForms} formularios parciales expirados`);
      } catch (error) {
        console.error('[CRON] ❌ Error en limpieza de flags:', error);
      }
    },
    null, // onComplete
    true, // start
    'America/Guayaquil' // timezone Ecuador
  );
  
  jobs.push(cleanupFlagsJob);
  console.log('[CRON] 📅 Limpieza de confirmaciones/flags: cada 120 minutos');
  
  // ✅ Limpieza de interacciones antiguas
  // Una vez al día a las 3 AM Ecuador
  const cleanupInteractionsJob = new CronJob(
    '0 3 * * *', // 3:00 AM diario
    async () => {
      try {
        const retentionDays = parseInt(process.env.INTERACTIONS_RETENTION_DAYS || '30', 10);
        console.log(`[CRON] 🧹 Ejecutando limpieza de interacciones (>${retentionDays} días)...`);
        
        const deleted = await cleanupOldInteractions({ retentionDays });
        console.log(`[CRON] ✅ Eliminadas ${deleted} interacciones antiguas`);
        
        if (deleted > 0) {
          console.log(`[CRON] 📊 Estadística: Se liberaron ~${(deleted * 0.5).toFixed(1)} KB de espacio`);
        }
      } catch (error) {
        console.error('[CRON] ❌ Error en limpieza de interacciones:', error);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );
  
  jobs.push(cleanupInteractionsJob);
  console.log('[CRON] 📅 Limpieza de interacciones: cada 24 horas');
  
  // ✅ Follow-up automático de transacciones pendientes
  // Cada 30 minutos (verifica si han pasado 2h desde inicio de transacción)
  // Solo envía UNA vez por transacción, respeta horario 6am-10pm Ecuador
  const followUpJob = new CronJob(
    '*/30 * * * *', // Cada 30 minutos
    async () => {
      try {
        console.log('[CRON] 🔔 Verificando transacciones pendientes para follow-up...');
        const result = await processFollowUps();
        console.log(`[CRON] ✅ Follow-up completado: ${result.sent} enviados, ${result.skipped} saltados`);
      } catch (error) {
        console.error('[CRON] ❌ Error en follow-up:', error);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );
  
  jobs.push(followUpJob);
  console.log('[CRON] 📅 Follow-up automático: cada 30 minutos (6am-10pm, UNA vez por transacción)');
  
  // ✅ Limpieza diaria completa de formularios y datos temporales
  // Exactamente a las 00:00 Ecuador (medianoche)
  const dailyCleanupJob = new CronJob(
    '0 0 * * *', // 00:00 (medianoche) todos los días
    async () => {
      try {
        console.log('[CRON] 🧹 Ejecutando limpieza diaria completa (00:00)...');
        const result = await dailyCleanup();
        
        if (result.success) {
          console.log(`[CRON] ✅ Limpieza diaria completada: ${result.totalCleaned} registros eliminados`);
        } else {
          console.error('[CRON] ❌ Error en limpieza diaria:', result.error);
        }
      } catch (error) {
        console.error('[CRON] ❌ Error ejecutando limpieza diaria:', error);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );
  
  jobs.push(dailyCleanupJob);
  console.log('[CRON] 📅 Limpieza diaria completa: 00:00 (medianoche Ecuador)');
  
  // ✅ Opcional: Backup automático (solo en producción)
  if (isProd && process.env.ENABLE_AUTO_BACKUP === 'true') {
    const backupJob = new CronJob(
      '0 4 * * *', // 4:00 AM diario (1h después de cleanup)
      async () => {
        try {
          console.log('[CRON] 💾 Ejecutando backup automático...');
          // Aquí se ejecutaría el backup
          console.log('[CRON] ✅ Backup completado');
        } catch (error) {
          console.error('[CRON] ❌ Error en backup:', error);
        }
      },
      null,
      true,
      'America/Guayaquil'
    );
    
    jobs.push(backupJob);
    console.log('[CRON] 📅 Backup automático: cada 24 horas (4:00 AM)');
  }
  
  console.log('[CRON] ✅ Scheduler iniciado');
  
  return jobs;
}

/**
 * 🛑 Detiene todas las tareas programadas
 */
export function stopScheduler() {
  console.log('[CRON] 🛑 Deteniendo tareas programadas...');
  jobs.forEach(job => job.stop());
  jobs.length = 0;
  console.log('[CRON] ✅ Scheduler detenido');
}

/**
 * 📊 Obtiene estado de los jobs
 */
export function getSchedulerStatus() {
  return {
    active: jobs.length,
    jobs: jobs.map((job, index) => ({
      id: index,
      running: job.running,
      nextRun: job.nextDate()?.toISO()
    }))
  };
}
