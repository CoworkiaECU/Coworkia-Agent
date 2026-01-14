import 'dotenv/config';
import databaseService from '../../src/database/database.js';

/**
 * LIMPIEZA AUTOMÁTICA EN CADA DEPLOY
 * 
 * Este script se ejecuta ANTES de iniciar el servidor en cada deploy.
 * Limpia solo reservas/confirmaciones pendientes para testing limpio.
 */

async function cleanupOnRelease() {
  console.log('🚀 [RELEASE PHASE] Limpieza pre-deploy iniciada...\n');
  
  try {
    // Inicializar base de datos
    if (!databaseService.isInitialized) {
      await databaseService.initialize();
    }
    
    console.log('📊 Estado ANTES de limpieza:');
    
    const counts = {
      reservations: await databaseService.get('SELECT COUNT(*) as total FROM reservations'),
      pendingConfirmations: await databaseService.get('SELECT COUNT(*) as total FROM pending_confirmations'),
      interactions: await databaseService.get('SELECT COUNT(*) as total FROM interactions WHERE created_at > datetime("now", "-1 hour")')
    };
    
    console.log(`  📅 Reservas: ${counts.reservations.total}`);
    console.log(`  ⏳ Confirmaciones pendientes: ${counts.pendingConfirmations.total}`);
    console.log(`  💬 Interacciones última hora: ${counts.interactions.total}\n`);
    
    // LIMPIEZA FOCALIZADA
    console.log('🧹 Limpiando confirmaciones pendientes...');
    await databaseService.run('DELETE FROM pending_confirmations');
    
    console.log('🧹 Limpiando reservas pendientes o canceladas...');
    await databaseService.run(`
      DELETE FROM reservations 
      WHERE status IN ('pending', 'pending_confirmation', 'pending_payment', 'cancelled')
    `);
    
    console.log('🧹 Limpiando interacciones antiguas (>24h)...');
    await databaseService.run(`
      DELETE FROM interactions 
      WHERE created_at < datetime('now', '-24 hours')
    `);
    
    // RESETEAR FLAGS DE USUARIOS (para permitir nuevas interacciones)
    console.log('🧹 Reseteando flags de usuarios...');
    await databaseService.run(`
      UPDATE users 
      SET 
        pending_confirmation = false,
        pending_form = false,
        awaiting_reservation_confirmation = false,
        transaction_started_at = NULL,
        transaction_agent = NULL
      WHERE pending_confirmation = true 
         OR pending_form = true 
         OR awaiting_reservation_confirmation = true
    `);
    
    console.log('\n✅ [RELEASE PHASE] Limpieza completada exitosamente');
    console.log('📊 Base de datos lista para testing\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ [RELEASE PHASE] Error en limpieza:', error);
    // NO fallar el deploy por error de limpieza
    console.log('⚠️  Continuando deploy a pesar del error...\n');
    process.exit(0);
  }
}

// Ejecutar
cleanupOnRelease();
