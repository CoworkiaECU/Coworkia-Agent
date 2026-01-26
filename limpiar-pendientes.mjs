// 🧹 Script para limpiar TODAS las reservas pendientes y formularios activos
import databaseService from './src/database/database.js';

console.log('🧹 LIMPIEZA DE RESERVAS PENDIENTES Y FORMULARIOS\n');
console.log('═══════════════════════════════════════════════\n');

async function limpiarPendientes() {
  await databaseService.initialize();
  
  console.log('1️⃣ Limpiando reservas pendientes...');
  const res = await databaseService.run(
    `DELETE FROM reservations 
     WHERE status IN ('pending', 'pending_confirmation', 'pending_payment')`
  );
  console.log(`   ✅ ${res.changes || 0} reservas eliminadas\n`);
  
  console.log('2️⃣ Limpiando formularios activos...');
  const forms = await databaseService.run(
    'DELETE FROM agent_forms WHERE is_active = TRUE'
  );
  console.log(`   ✅ ${forms.changes || 0} formularios eliminados\n`);
  
  console.log('3️⃣ Limpiando confirmaciones pendientes...');
  const conf = await databaseService.run(
    'DELETE FROM pending_confirmations'
  );
  console.log(`   ✅ ${conf.changes || 0} confirmaciones eliminadas\n`);
  
  console.log('✅ LIMPIEZA COMPLETADA\n');
  process.exit(0);
}

limpiarPendientes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
