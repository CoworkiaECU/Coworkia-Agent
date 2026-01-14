import 'dotenv/config';
import databaseService from '../../src/database/database.js';

/**
 * LIMPIEZA COMPLETA DE DATOS EN PRODUCCIÓN
 * 
 * Limpia todas las operaciones pendientes y datos transaccionales
 * manteniendo la estructura de la base de datos intacta.
 */

async function resetProductionData() {
  console.log('🧹 LIMPIEZA COMPLETA DE BASE DE DATOS PRODUCCIÓN\n');
  
  try {
    // Inicializar base de datos
    if (!databaseService.isInitialized) {
      await databaseService.initialize();
    }
    
    console.log('📊 Contando registros ANTES de limpieza...\n');
    
    // Contar registros
    const counts = {
      users: await databaseService.get('SELECT COUNT(*) as total FROM users'),
      reservations: await databaseService.get('SELECT COUNT(*) as total FROM reservations'),
      interactions: await databaseService.get('SELECT COUNT(*) as total FROM interactions'),
      pendingConfirmations: await databaseService.get('SELECT COUNT(*) as total FROM pending_confirmations'),
      partialForms: await databaseService.get('SELECT COUNT(*) as total FROM partial_forms'),
      reservationState: await databaseService.get('SELECT COUNT(*) as total FROM reservation_state'),
      axelQuotes: await databaseService.get('SELECT COUNT(*) as total FROM axel_quotes')
    };
    
    console.log(`👥 Usuarios: ${counts.users.total}`);
    console.log(`📅 Reservas: ${counts.reservations.total}`);
    console.log(`💬 Interacciones: ${counts.interactions.total}`);
    console.log(`⏳ Confirmaciones pendientes: ${counts.pendingConfirmations.total}`);
    console.log(`📋 Formularios parciales: ${counts.partialForms.total}`);
    console.log(`🔄 Estados de reserva: ${counts.reservationState.total}`);
    console.log(`🚗 Cotizaciones Axel: ${counts.axelQuotes.total}\n`);
    
    console.log('⚠️  INICIANDO LIMPIEZA...\n');
    
    // LIMPIAR DATOS TRANSACCIONALES
    console.log('🗑️  Limpiando confirmaciones pendientes...');
    await databaseService.run('DELETE FROM pending_confirmations');
    console.log('✅ Confirmaciones pendientes eliminadas\n');
    
    console.log('🗑️  Limpiando formularios parciales...');
    await databaseService.run('DELETE FROM partial_forms');
    console.log('✅ Formularios parciales eliminados\n');
    
    console.log('🗑️  Limpiando estados de reserva...');
    await databaseService.run('DELETE FROM reservation_state');
    console.log('✅ Estados de reserva eliminados\n');
    
    console.log('🗑️  Limpiando interacciones...');
    await databaseService.run('DELETE FROM interactions');
    console.log('✅ Interacciones eliminadas\n');
    
    console.log('🗑️  Limpiando reservas...');
    await databaseService.run('DELETE FROM reservations');
    console.log('✅ Reservas eliminadas\n');
    
    console.log('🗑️  Limpiando cotizaciones Axel...');
    await databaseService.run('DELETE FROM axel_quotes');
    console.log('✅ Cotizaciones Axel eliminadas\n');
    
    // RESETEAR USUARIOS (mantener estructura pero limpiar flags)
    console.log('🔄 Reseteando usuarios (limpiando flags de follow-up)...');
    await databaseService.run(`
      UPDATE users 
      SET 
        transaction_started_at = NULL,
        transaction_agent = NULL,
        follow_up_sent_at = NULL,
        free_trial_used = 0,
        active_agent = 'AURORA'
    `);
    console.log('✅ Usuarios reseteados\n');
    
    console.log('📊 Contando registros DESPUÉS de limpieza...\n');
    
    const countsAfter = {
      users: await databaseService.get('SELECT COUNT(*) as total FROM users'),
      reservations: await databaseService.get('SELECT COUNT(*) as total FROM reservations'),
      interactions: await databaseService.get('SELECT COUNT(*) as total FROM interactions'),
      pendingConfirmations: await databaseService.get('SELECT COUNT(*) as total FROM pending_confirmations'),
      partialForms: await databaseService.get('SELECT COUNT(*) as total FROM partial_forms'),
      reservationState: await databaseService.get('SELECT COUNT(*) as total FROM reservation_state'),
      axelQuotes: await databaseService.get('SELECT COUNT(*) as total FROM axel_quotes')
    };
    
    console.log(`👥 Usuarios: ${countsAfter.users.total} (mantenidos, flags limpiados)`);
    console.log(`📅 Reservas: ${countsAfter.reservations.total}`);
    console.log(`💬 Interacciones: ${countsAfter.interactions.total}`);
    console.log(`⏳ Confirmaciones pendientes: ${countsAfter.pendingConfirmations.total}`);
    console.log(`📋 Formularios parciales: ${countsAfter.partialForms.total}`);
    console.log(`🔄 Estados de reserva: ${countsAfter.reservationState.total}`);
    console.log(`🚗 Cotizaciones Axel: ${countsAfter.axelQuotes.total}\n`);
    
    console.log('✅ LIMPIEZA COMPLETADA EXITOSAMENTE\n');
    console.log('🎯 Base de datos lista para testing limpio\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante limpieza:', error);
    process.exit(1);
  }
}

resetProductionData();
