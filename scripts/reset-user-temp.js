const pg = require('pg');

const userId = '+593987770788';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  
  try {
    await client.query('BEGIN');
    
    const r1 = await client.query('DELETE FROM reservations WHERE user_phone = $1', [userId]);
    console.log('✅ Reservas eliminadas:', r1.rowCount);
    
    const r2 = await client.query('DELETE FROM pending_confirmations WHERE user_phone = $1', [userId]);
    console.log('✅ Pending limpiado:', r2.rowCount);
    
    const r3 = await client.query('DELETE FROM partial_forms WHERE user_phone = $1', [userId]);
    console.log('✅ Forms limpiado:', r3.rowCount);
    
    const r4 = await client.query('DELETE FROM reservation_state WHERE user_phone = $1', [userId]);
    console.log('✅ State limpiado:', r4.rowCount);
    
    const r5 = await client.query('UPDATE users SET free_trial_used = false, free_trial_date = NULL WHERE phone_number = $1', [userId]);
    console.log('✅ Usuario reseteado a NUEVO:', r5.rowCount);
    
    await client.query('COMMIT');
    console.log('\n🎉 LISTO - Usuario es CLIENTE NUEVO\n');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
    process.exit(0);
  }
})();
