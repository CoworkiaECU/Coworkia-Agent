import { PostgresAdapter } from '../../src/database/postgres-adapter.js';

const PHONE_NUMBERS = ['+593987770788', '+593992320262'];

console.log('🧹 LIMPIEZA COMPLETA PARA PRUEBAS\n');

const db = new PostgresAdapter();

for (const phone of PHONE_NUMBERS) {
  console.log(`📱 Limpiando: ${phone}`);
  
  // 1. Forzar activeAgent = AURORA
  await db.run(
    `UPDATE users 
     SET profile_data = jsonb_set(
       COALESCE(profile_data, '{}'), 
       '{activeAgent}', 
       '"AURORA"'
     ),
     whatsapp_display_name = NULL
     WHERE phone_number = ?`,
    [phone]
  );
  console.log('   ✅ activeAgent → AURORA, nombre reseteado');
  
  // 2. Eliminar pending_confirmations
  const conf = await db.run('DELETE FROM pending_confirmations WHERE user_phone = ?', [phone]);
  console.log(`   ✅ ${conf.changes || 0} confirmaciones eliminadas`);
  
  // 3. Eliminar reservation_state
  const state = await db.run('DELETE FROM reservation_state WHERE user_phone = ?', [phone]);
  console.log(`   ✅ ${state.changes || 0} estados eliminados`);
  
  // 4. Eliminar reservas no confirmadas
  const res = await db.run(
    `DELETE FROM reservations 
     WHERE user_phone = ? 
     AND status IN ('pending', 'pending_confirmation', 'pending_payment', 'cancelled')`,
    [phone]
  );
  console.log(`   ✅ ${res.changes || 0} reservas eliminadas`);
  
  // 5. Cancelar forms activos
  const forms = await db.run(
    `UPDATE agent_forms 
     SET is_active = FALSE, cancelled_at = NOW() 
     WHERE user_phone = ? AND is_active = TRUE`,
    [phone]
  );
  console.log(`   ✅ ${forms.changes || 0} formularios cancelados`);
  
  console.log('');
}

await db.close();
console.log('✅ Limpieza completada - Listos para pruebas frescas\n');
