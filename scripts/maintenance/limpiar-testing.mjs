import pg from 'pg';
const { Client } = pg;

const PHONE_NUMBERS = ['+593987770788', '+593992320262'];

console.log('🧹 LIMPIEZA COMPLETA PARA PRUEBAS\n');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

for (const phone of PHONE_NUMBERS) {
  console.log(`📱 Limpiando: ${phone}`);
  
  // 1. Forzar activeAgent = AURORA
  await client.query(
    `UPDATE users 
     SET profile_data = jsonb_set(
       COALESCE(profile_data, '{}'), 
       '{activeAgent}', 
       '"AURORA"'
     ),
     whatsapp_display_name = NULL
     WHERE phone_number = $1`,
    [phone]
  );
  console.log('   ✅ activeAgent → AURORA, nombre reseteado');
  
  // 2. Eliminar pending_confirmations
  const conf = await client.query('DELETE FROM pending_confirmations WHERE user_phone = $1', [phone]);
  console.log(`   ✅ ${conf.rowCount || 0} confirmaciones eliminadas`);
  
  // 3. Eliminar reservation_state
  const state = await client.query('DELETE FROM reservation_state WHERE user_phone = $1', [phone]);
  console.log(`   ✅ ${state.rowCount || 0} estados eliminados`);
  
  // 4. Eliminar reservas no confirmadas
  const res = await client.query(
    `DELETE FROM reservations 
     WHERE user_phone = $1 
     AND status IN ('pending', 'pending_confirmation', 'pending_payment', 'cancelled')`,
    [phone]
  );
  console.log(`   ✅ ${res.rowCount || 0} reservas eliminadas`);
  
  // 5. Cancelar forms activos
  const forms = await client.query(
    `UPDATE agent_forms 
     SET is_active = FALSE, cancelled_at = NOW() 
     WHERE user_phone = $1 AND is_active = TRUE`,
    [phone]
  );
  console.log(`   ✅ ${forms.rowCount || 0} formularios cancelados`);
  
  console.log('');
}

await client.end();
console.log('✅ Limpieza completada - Listos para pruebas frescas\n');
