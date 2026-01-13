#!/usr/bin/env node
/**
 * 🧹 Script para limpiar reservas pasadas automáticamente
 * Se puede ejecutar manualmente o programar en un cron job
 * 
 * Uso: node scripts/cleanup-past-reservations.js [--dry-run]
 */

import 'dotenv/config';
import databaseService from '../../src/database/database.js';

async function cleanupPastReservations(dryRun = false) {
  try {
    await databaseService.initialize();
    
    // Obtener fecha actual como string (formato YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Contar reservas pasadas
    const countResult = await databaseService.get(`
      SELECT COUNT(*) as total
      FROM reservations 
      WHERE date < ?
    `, [today]);
    
    const pastCount = countResult?.total || 0;
    
    if (pastCount === 0) {
      console.log('[CLEANUP] ✅ No hay reservas pasadas para limpiar');
      return 0;
    }
    
    if (dryRun) {
      // Mostrar las que se encontraron sin eliminar
      const pastReservations = await databaseService.all(`
        SELECT user_phone, date, start_time, service_type, status
        FROM reservations 
        WHERE date < ?
        ORDER BY date DESC
      `, [today]);
      
      console.log(`[CLEANUP] 🔍 DRY RUN - Se encontraron ${pastCount} reserva(s) pasada(s):`);
      pastReservations.forEach((row, i) => {
        const dateStr = typeof row.date === 'string' ? 
          row.date.split('T')[0] : 
          new Date(row.date).toISOString().split('T')[0];
        console.log(`  ${i + 1}. ${row.user_phone} - ${dateStr} ${row.start_time} (${row.service_type})`);
      });
      
      return pastCount;
    }
    
    // Eliminar reservas pasadas
    const result = await databaseService.run(`
      DELETE FROM reservations 
      WHERE date < ?
    `, [today]);
    
    const deletedCount = result?.changes || 0;
    console.log(`[CLEANUP] ✅ Eliminadas ${deletedCount} reserva(s) pasada(s)`);
    
    return deletedCount;
    
  } catch (error) {
    console.error('[CLEANUP] ❌ Error limpiando reservas pasadas:', error);
    throw error;
  } finally {
    await databaseService.close();
  }
}

// CLI
async function cli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  try {
    const count = await cleanupPastReservations(dryRun);
    process.exit(count > 0 ? 0 : 0); // Siempre exit 0 para no fallar en cron
  } catch (error) {
    console.error('[CLEANUP] ❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  cli();
}

export default cleanupPastReservations;
