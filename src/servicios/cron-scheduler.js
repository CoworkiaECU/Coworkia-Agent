/**
 * ⏰ Cron Scheduler para tareas automáticas
 * 
 * Este módulo ejecuta tareas periódicas:
 * - Limpieza de confirmaciones expiradas (cada hora)
 * - Limpieza de flags justConfirmed (cada hora)
 * - Backup automático (cada 6 horas, si está configurado)
 * - Limpieza de interacciones antiguas (cada día)
 */

import {
  cleanupExpiredConfirmations,
  cleanupJustConfirmedFlags,
  cleanupOldInteractions
} from '../../scripts/cleanup-expired-data.js';

// Intervalos en milisegundos
const ONE_HOUR = 60 * 60 * 1000;
const SIX_HOURS = 6 * ONE_HOUR;
const ONE_DAY = 24 * ONE_HOUR;

let intervals = [];

/**
 * 🔄 Ejecuta limpieza de confirmaciones expiradas
 */
async function runConfirmationCleanup() {
  try {
    console.log('[CRON] 🧹 Ejecutando limpieza de confirmaciones expiradas...');
    const count = await cleanupExpiredConfirmations();
    if (count > 0) {
      console.log(`[CRON] ✅ Eliminadas ${count} confirmaciones expiradas`);
    }
  } catch (error) {
    console.error('[CRON] ❌ Error en limpieza de confirmaciones:', error);
  }
}

/**
 * 🔄 Ejecuta limpieza de flags justConfirmed
 */
async function runJustConfirmedCleanup() {
  try {
    console.log('[CRON] 🧹 Ejecutando limpieza de flags justConfirmed...');
    const count = await cleanupJustConfirmedFlags();
    if (count > 0) {
      console.log(`[CRON] ✅ Limpiados ${count} flags expirados`);
    }
  } catch (error) {
    console.error('[CRON] ❌ Error en limpieza de flags:', error);
  }
}

/**
 * 🔄 Ejecuta limpieza de interacciones antiguas
 */
async function runInteractionsCleanup() {
  try {
    console.log('[CRON] 🧹 Ejecutando limpieza de interacciones antiguas (>90 días)...');
    const count = await cleanupOldInteractions();
    if (count > 0) {
      console.log(`[CRON] ✅ Eliminadas ${count} interacciones antiguas`);
    }
  } catch (error) {
    console.error('[CRON] ❌ Error en limpieza de interacciones:', error);
  }
}

/**
 * 🚀 Inicia el scheduler
 */
export function startCronJobs() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  console.log('[CRON] ⏰ Iniciando tareas programadas...');
  console.log(`[CRON] 🔧 Modo: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  
  // En desarrollo, ejecutar cada 5 minutos para testing
  // En producción, ejecutar cada hora
  const cleanupInterval = isDevelopment ? 5 * 60 * 1000 : ONE_HOUR;
  
  // Limpieza de confirmaciones y flags cada hora (o 5min en dev)
  const confirmationInterval = setInterval(async () => {
    await runConfirmationCleanup();
    await runJustConfirmedCleanup();
  }, cleanupInterval);
  
  intervals.push(confirmationInterval);
  
  // Limpieza de interacciones antiguas cada día
  const interactionsInterval = setInterval(runInteractionsCleanup, ONE_DAY);
  intervals.push(interactionsInterval);
  
  // Ejecutar una vez al inicio (después de 1 minuto)
  setTimeout(async () => {
    await runConfirmationCleanup();
    await runJustConfirmedCleanup();
  }, 60 * 1000);
  
  console.log(`[CRON] ✅ Scheduler iniciado`);
  console.log(`[CRON] 📅 Limpieza de confirmaciones/flags: cada ${cleanupInterval / 60000} minutos`);
  console.log(`[CRON] 📅 Limpieza de interacciones: cada 24 horas`);
}

/**
 * 🛑 Detiene el scheduler
 */
export function stopCronJobs() {
  console.log('[CRON] 🛑 Deteniendo tareas programadas...');
  intervals.forEach(interval => clearInterval(interval));
  intervals = [];
  console.log('[CRON] ✅ Scheduler detenido');
}

// Limpieza al cerrar la aplicación
process.on('SIGTERM', stopCronJobs);
process.on('SIGINT', stopCronJobs);
