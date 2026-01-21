// 🧹 Limpieza de base de datos para testing
// Elimina reservaciones y transacciones pendientes

import db from '../../src/database/postgres-adapter.js';

console.log('🧹 [CLEANUP] Limpieza de base de datos para testing\n');
console.log('═'.repeat(70));

// Inicializar base de datos
console.log('\n🔌 Conectando a PostgreSQL...');
await db.initialize();
console.log('✅ Conectado\n');

// ========================================
// PASO 1: Ver estado actual
// ========================================
console.log('📊 ESTADO ACTUAL DE LA BASE DE DATOS');
console.log('─'.repeat(70));

try {
  // Contar reservaciones por estado
  const reservations = await db.all(
    `SELECT status, COUNT(*) as count FROM reservations GROUP BY status`
  );
  
  console.log('\n📅 Reservaciones:');
  reservations.forEach(row => {
    console.log(`   ${row.status}: ${row.count}`);
  });
  
  // Contar total
  const totalReservations = await db.get(
    `SELECT COUNT(*) as total FROM reservations`
  );
  console.log(`   TOTAL: ${totalReservations.total}`);
  
  // Contar membership leads por estado
  const leads = await db.all(
    `SELECT status, COUNT(*) as count FROM membership_leads GROUP BY status`
  );
  
  console.log('\n💼 Membership Leads:');
  leads.forEach(row => {
    console.log(`   ${row.status}: ${row.count}`);
  });
  
  const totalLeads = await db.get(
    `SELECT COUNT(*) as total FROM membership_leads`
  );
  console.log(`   TOTAL: ${totalLeads.total}`);
  
  // Contar membership payments
  const totalPayments = await db.get(
    `SELECT COUNT(*) as total FROM membership_payments`
  );
  
  console.log('\n💳 Membership Payments:');
  console.log(`   TOTAL: ${totalPayments.total}`);
  
  // Contar pending confirmations
  const totalPending = await db.get(
    `SELECT COUNT(*) as total FROM pending_confirmations`
  );
  
  console.log('\n⏳ Pending Confirmations:');
  console.log(`   TOTAL: ${totalPending.total}`);
  
} catch (error) {
  console.error('❌ Error consultando estado:', error.message);
}

// ========================================
// PASO 2: Confirmar limpieza
// ========================================
console.log('\n═'.repeat(70));
console.log('⚠️  SE ELIMINARÁN:');
console.log('─'.repeat(70));
console.log('');
console.log('📅 Reservaciones con estado:');
console.log('   - pending');
console.log('   - pending_confirmation');
console.log('   - pending_payment');
console.log('   - cancelled');
console.log('');
console.log('💼 Membership Leads con estado:');
console.log('   - pending');
console.log('   - payment_pending');
console.log('');
console.log('⏳ TODAS las confirmaciones pendientes');
console.log('');
console.log('✅ SE MANTENDRÁN:');
console.log('   - Reservaciones: confirmed, completed');
console.log('   - Membership Leads: accepted, active');
console.log('');

// ========================================
// PASO 3: Ejecutar limpieza
// ========================================
console.log('═'.repeat(70));
console.log('🚀 EJECUTANDO LIMPIEZA...');
console.log('─'.repeat(70));

try {
  // Limpiar pending_confirmations
  console.log('\n🧹 Limpiando pending_confirmations...');
  const result1 = await db.run('DELETE FROM pending_confirmations');
  console.log(`✅ Eliminadas: ${result1.changes || 0}`);
  
  // Limpiar reservaciones pendientes
  console.log('\n🧹 Limpiando reservaciones pendientes...');
  const result2 = await db.run(
    `DELETE FROM reservations WHERE status IN ('pending', 'pending_confirmation', 'pending_payment', 'cancelled')`
  );
  console.log(`✅ Eliminadas: ${result2.changes || 0}`);
  
  // Limpiar membership leads pendientes
  console.log('\n🧹 Limpiando membership leads pendientes...');
  const result3 = await db.run(
    `DELETE FROM membership_leads WHERE status IN ('pending', 'payment_pending')`
  );
  console.log(`✅ Eliminadas: ${result3.changes || 0}`);
  
  // Limpiar membership payments huérfanos (sin lead asociado)
  console.log('\n🧹 Limpiando membership payments huérfanos...');
  const result4 = await db.run(
    `DELETE FROM membership_payments 
     WHERE membership_lead_id NOT IN (SELECT id FROM membership_leads)`
  );
  console.log(`✅ Eliminadas: ${result4.changes || 0}`);
  
} catch (error) {
  console.error('❌ Error durante limpieza:', error.message);
}

// ========================================
// PASO 4: Verificar estado final
// ========================================
console.log('\n═'.repeat(70));
console.log('📊 ESTADO DESPUÉS DE LIMPIEZA');
console.log('─'.repeat(70));

try {
  // Contar reservaciones restantes
  const finalReservations = await db.all(
    `SELECT status, COUNT(*) as count FROM reservations GROUP BY status`
  );
  
  console.log('\n📅 Reservaciones (solo confirmadas/completadas):');
  if (finalReservations.length === 0) {
    console.log('   (ninguna)');
  } else {
    finalReservations.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
  }
  
  const totalFinalReservations = await db.get(
    `SELECT COUNT(*) as total FROM reservations`
  );
  console.log(`   TOTAL: ${totalFinalReservations.total}`);
  
  // Contar leads restantes
  const finalLeads = await db.all(
    `SELECT status, COUNT(*) as count FROM membership_leads GROUP BY status`
  );
  
  console.log('\n💼 Membership Leads (solo accepted/active):');
  if (finalLeads.length === 0) {
    console.log('   (ninguno)');
  } else {
    finalLeads.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
  }
  
  const totalFinalLeads = await db.get(
    `SELECT COUNT(*) as total FROM membership_leads`
  );
  console.log(`   TOTAL: ${totalFinalLeads.total}`);
  
  // Verificar pending confirmations
  const finalPending = await db.get(
    `SELECT COUNT(*) as total FROM pending_confirmations`
  );
  
  console.log('\n⏳ Pending Confirmations:');
  console.log(`   TOTAL: ${finalPending.total} ✅`);
  
} catch (error) {
  console.error('❌ Error verificando estado final:', error.message);
}

// ========================================
// RESUMEN
// ========================================
console.log('\n═'.repeat(70));
console.log('✅ LIMPIEZA COMPLETADA');
console.log('═'.repeat(70));
console.log('');
console.log('🎯 Base de datos lista para testing limpio');
console.log('');
console.log('💡 Próximo paso: Testing de flujo completo Aluna → Gabi');
console.log('   1. Usuario llena formulario con Aluna');
console.log('   2. Lead guardado en estado "payment_pending"');
console.log('   3. Usuario envía comprobante');
console.log('   4. VisionAI valida y aprueba');
console.log('   5. Gabi envía recibo por email');
console.log('');
console.log('🧹 [CLEANUP] Script completado');

// Cerrar conexión
await db.close();
