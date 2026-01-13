#!/usr/bin/env node
/**
 * 🧹 Script para verificar y limpiar TODOS los datos temporales y cache
 * Limpia: pending_confirmations, reservation_state, partial_forms, reservas pasadas
 * 
 * Uso: 
 *   node scripts/cleanup-all-cache.js              # Ejecutar limpieza
 *   node scripts/cleanup-all-cache.js --dry-run    # Solo verificar sin limpiar
 *   node scripts/cleanup-all-cache.js --user +593... # Para un usuario específico
 */

import 'dotenv/config';
import databaseService from '../src/database/database.js';

async function cleanupAllCache({ dryRun = false, userPhone = null } = {}) {
  try {
    await databaseService.initialize();
    
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      pendingConfirmations: 0,
      justConfirmedFlags: 0,
      partialForms: 0,
      pastReservations: 0
    };
    
    // Construir WHERE clause
    const userFilter = userPhone ? 'WHERE user_phone = ?' : '';
    const userParams = userPhone ? [userPhone] : [];
    
    if (dryRun) {
      // Solo contar, no eliminar
      console.log('[CLEANUP] 🔍 DRY RUN - Verificando datos a limpiar...\n');
      
      const r1 = await databaseService.get(
        `SELECT COUNT(*) as count FROM pending_confirmations ${userFilter}`,
        userParams
      );
      stats.pendingConfirmations = r1?.count || 0;
      
      const r2 = await databaseService.get(
        `SELECT COUNT(*) as count FROM reservation_state 
         ${userPhone ? 'WHERE user_phone = ? AND' : 'WHERE'} just_confirmed_until IS NOT NULL`,
        userParams
      );
      stats.justConfirmedFlags = r2?.count || 0;
      
      const r3 = await databaseService.get(
        `SELECT COUNT(*) as count FROM partial_forms ${userFilter}`,
        userParams
      );
      stats.partialForms = r3?.count || 0;
      
      const dateFilter = userPhone ? 'WHERE date < ? AND user_phone = ?' : 'WHERE date < ?';
      const dateParams = userPhone ? [today, userPhone] : [today];
      const r4 = await databaseService.get(
        `SELECT COUNT(*) as count FROM reservations ${dateFilter}`,
        dateParams
      );
      stats.pastReservations = r4?.count || 0;
      
      console.log('[CLEANUP] Datos encontrados:');
      console.log(`  • Confirmaciones pendientes: ${stats.pendingConfirmations}`);
      console.log(`  • Flags just_confirmed activos: ${stats.justConfirmedFlags}`);
      console.log(`  • Formularios parciales: ${stats.partialForms}`);
      console.log(`  • Reservas pasadas: ${stats.pastReservations}`);
      
    } else {
      // Ejecutar limpieza
      console.log('[CLEANUP] 🧹 Limpiando datos temporales...\n');
      
      // 1. Pending confirmations
      const r1 = await databaseService.run(
        `DELETE FROM pending_confirmations ${userFilter}`,
        userParams
      );
      stats.pendingConfirmations = r1?.changes || 0;
      
      // 2. Just confirmed flags
      const r2 = await databaseService.run(
        `UPDATE reservation_state 
         SET just_confirmed_until = NULL
         ${userPhone ? 'WHERE user_phone = ? AND' : 'WHERE'} just_confirmed_until IS NOT NULL`,
        userParams
      );
      stats.justConfirmedFlags = r2?.changes || 0;
      
      // 3. Partial forms
      const r3 = await databaseService.run(
        `DELETE FROM partial_forms ${userFilter}`,
        userParams
      );
      stats.partialForms = r3?.changes || 0;
      
      // 4. Past reservations
      const dateFilter = userPhone ? 'WHERE date < ? AND user_phone = ?' : 'WHERE date < ?';
      const dateParams = userPhone ? [today, userPhone] : [today];
      const r4 = await databaseService.run(
        `DELETE FROM reservations ${dateFilter}`,
        dateParams
      );
      stats.pastReservations = r4?.changes || 0;
      
      console.log('[CLEANUP] ✅ Limpieza completada:');
      console.log(`  • Confirmaciones pendientes eliminadas: ${stats.pendingConfirmations}`);
      console.log(`  • Flags just_confirmed limpiados: ${stats.justConfirmedFlags}`);
      console.log(`  • Formularios parciales eliminados: ${stats.partialForms}`);
      console.log(`  • Reservas pasadas eliminadas: ${stats.pastReservations}`);
    }
    
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
      console.log('\n✅ Todo está limpio - no hay datos temporales');
    }
    
    return stats;
    
  } catch (error) {
    console.error('[CLEANUP] ❌ Error:', error);
    throw error;
  } finally {
    await databaseService.close();
  }
}

// CLI
async function cli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const userArg = args.find(arg => arg.startsWith('--user='));
  const userPhone = userArg ? userArg.split('=')[1] : null;
  
  try {
    await cleanupAllCache({ dryRun, userPhone });
    process.exit(0);
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

export default cleanupAllCache;
