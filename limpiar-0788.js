import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const phone = '+593987770788';

async function limpiar() {
  const client = await pool.connect();
  try {
    console.log('🧹 Limpiando datos de:', phone);
    
    await client.query('BEGIN');
    
    // 1. pending_confirmations
    const r1 = await client.query('DELETE FROM pending_confirmations WHERE user_phone = $1', [phone]);
    console.log('✅ Confirmaciones:', r1.rowCount);
    
    // 2. reservation_state
    const r2 = await client.query('DELETE FROM reservation_state WHERE user_phone = $1', [phone]);
    console.log('✅ Reservation state:', r2.rowCount);
    
    // 3. reservations pendientes
    const r3 = await client.query('DELETE FROM reservations WHERE user_phone = $1 AND status IN ($2, $3, $4, $5)', 
      [phone, 'pending', 'pending_confirmation', 'pending_payment', 'cancelled']);
    console.log('✅ Reservas:', r3.rowCount);
    
    // 4. partial_forms
    const r4 = await client.query('DELETE FROM partial_forms WHERE user_phone = $1', [phone]);
    console.log('✅ Partial forms:', r4.rowCount);
    
    // 5. aurora_partial_reservations
    const r5 = await client.query('DELETE FROM aurora_partial_reservations WHERE user_phone = $1', [phone]);
    console.log('✅ Aurora partial:', r5.rowCount);
    
    // 6. aluna_partial_memberships
    const r6 = await client.query('DELETE FROM aluna_partial_memberships WHERE user_phone = $1', [phone]);
    console.log('✅ Aluna partial:', r6.rowCount);
    
    // 7. Ver perfil
    const user = await client.query('SELECT phone_number, "whatsappDisplayName", name FROM users WHERE phone_number = $1', [phone]);
    if (user.rows[0]) {
      console.log('📋 Perfil:', user.rows[0].whatsappDisplayName || user.rows[0].name || 'NULL');
    }
    
    await client.query('COMMIT');
    console.log('\n✅ LIMPIEZA COMPLETADA');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

limpiar();
