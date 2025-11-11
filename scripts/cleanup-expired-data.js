#!/usr/bin/env node
/**
 * 🧹 Cleanup automático de datos expirados en SQLite
 * 
 * Este script limpia:
 * - pending_confirmations expiradas (TTL: 30 min)
 * - justConfirmed flags expirados (TTL: 10 min)
 * - interactions antiguas (> 90 días)
 * 
 * Uso: node scripts/cleanup-expired-data.js
 * Heroku Scheduler: Ejecutar cada hora
 */

import databaseService from '../src/database/database.js';

const DRY_RUN = process.argv.includes('--dry-run');

console.log('🧹 LIMPIEZA DE DATOS EXPIRADOS');
console.log('═'.repeat(60));
console.log('Modo:', DRY_RUN ? 'DRY RUN (no se borrará nada)' : 'PRODUCCIÓN');
console.log('═'.repeat(60));

async function cleanupExpiredConfirmations() {
  const now = new Date().toISOString();
  
  // Contar cuántos hay expirados
  const count = await databaseService.get(
    'SELECT COUNT(*) as count FROM pending_confirmations WHERE expires_at IS NOT NULL AND expires_at < ?',
    [now]
  );
  
  console.log(`\n📋 Confirmaciones pendientes expiradas: ${count.count}`);
  
  if (count.count > 0 && !DRY_RUN) {
    await databaseService.run(
      'DELETE FROM pending_confirmations WHERE expires_at IS NOT NULL AND expires_at < ?',
      [now]
    );
    console.log(`   ✅ Eliminadas ${count.count} confirmaciones expiradas`);
  }
  
  return count.count;
}

async function cleanupJustConfirmedFlags() {
  const now = new Date().toISOString();
  
  // Contar cuántos flags activos hay
  const count = await databaseService.get(
    'SELECT COUNT(*) as count FROM reservation_state WHERE just_confirmed_until IS NOT NULL AND just_confirmed_until < ?',
    [now]
  );
  
  console.log(`\n🚩 Flags justConfirmed expirados: ${count.count}`);
  
  if (count.count > 0 && !DRY_RUN) {
    await databaseService.run(
      'UPDATE reservation_state SET just_confirmed_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE just_confirmed_until IS NOT NULL AND just_confirmed_until < ?',
      [now]
    );
    console.log(`   ✅ Limpiados ${count.count} flags expirados`);
  }
  
  return count.count;
}

async function cleanupOldInteractions() {
  // Mantener solo últimos 90 días de interacciones
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffIso = cutoffDate.toISOString();
  
  // Contar cuántas interacciones antiguas hay
  const count = await databaseService.get(
    'SELECT COUNT(*) as count FROM interactions WHERE timestamp < ?',
    [cutoffIso]
  );
  
  console.log(`\n💬 Interacciones antiguas (>90 días): ${count.count}`);
  
  if (count.count > 0 && !DRY_RUN) {
    await databaseService.run(
      'DELETE FROM interactions WHERE timestamp < ?',
      [cutoffIso]
    );
    console.log(`   ✅ Eliminadas ${count.count} interacciones antiguas`);
  }
  
  return count.count;
}

async function getStats() {
  const stats = {
    users: await databaseService.get('SELECT COUNT(*) as count FROM users'),
    reservations: await databaseService.get('SELECT COUNT(*) as count FROM reservations'),
    pendingConfirmations: await databaseService.get('SELECT COUNT(*) as count FROM pending_confirmations'),
    activeJustConfirmed: await databaseService.get(
      'SELECT COUNT(*) as count FROM reservation_state WHERE just_confirmed_until IS NOT NULL AND just_confirmed_until > ?',
      [new Date().toISOString()]
    ),
    interactions: await databaseService.get('SELECT COUNT(*) as count FROM interactions')
  };
  
  console.log('\n📊 ESTADÍSTICAS DE LA BASE DE DATOS');
  console.log('─'.repeat(60));
  console.log(`   Usuarios totales:              ${stats.users.count}`);
  console.log(`   Reservas totales:              ${stats.reservations.count}`);
  console.log(`   Confirmaciones pendientes:     ${stats.pendingConfirmations.count}`);
  console.log(`   Flags justConfirmed activos:   ${stats.activeJustConfirmed.count}`);
  console.log(`   Interacciones totales:         ${stats.interactions.count}`);
  
  return stats;
}

async function run() {
  try {
    console.log('\n⏳ Inicializando base de datos...');
    await databaseService.initialize();
    
    // Obtener stats antes
    console.log('\n📊 Estado ANTES de limpieza:');
    await getStats();
    
    // Ejecutar limpiezas
    const cleaned = {
      confirmations: await cleanupExpiredConfirmations(),
      justConfirmed: await cleanupJustConfirmedFlags(),
      interactions: await cleanupOldInteractions()
    };
    
    // Obtener stats después
    console.log('\n📊 Estado DESPUÉS de limpieza:');
    await getStats();
    
    // Resumen
    console.log('\n═'.repeat(60));
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('═'.repeat(60));
    console.log(`   Confirmaciones expiradas:  ${cleaned.confirmations}`);
    console.log(`   Flags expirados:           ${cleaned.justConfirmed}`);
    console.log(`   Interacciones antiguas:    ${cleaned.interactions}`);
    console.log('═'.repeat(60));
    
    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN: No se eliminó ningún dato');
      console.log('   Ejecuta sin --dry-run para aplicar cambios');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR durante limpieza:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export { cleanupExpiredConfirmations, cleanupJustConfirmedFlags, cleanupOldInteractions };
