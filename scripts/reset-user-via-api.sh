#!/bin/bash
# Script para resetear usuario de testing vía Heroku CLI

echo "🔄 Reseteando usuario +593987770788..."

heroku run "node -e \"
import('pg').then(async ({ default: pg }) => {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  try {
    await client.query('BEGIN');
    
    const r1 = await client.query('DELETE FROM reservations WHERE user_phone = \\$1', ['+593987770788']);
    console.log('✅ Reservas:', r1.rowCount);
    
    const r2 = await client.query('DELETE FROM pending_confirmations WHERE user_phone = \\$1', ['+593987770788']);
    console.log('✅ Pending:', r2.rowCount);
    
    const r3 = await client.query('DELETE FROM partial_forms WHERE user_phone = \\$1', ['+593987770788']);
    console.log('✅ Forms:', r3.rowCount);
    
    const r4 = await client.query('DELETE FROM reservation_state WHERE user_phone = \\$1', ['+593987770788']);
    console.log('✅ State:', r4.rowCount);
    
    const r5 = await client.query('UPDATE users SET free_trial_used = false, free_trial_date = NULL WHERE phone_number = \\$1', ['+593987770788']);
    console.log('✅ Usuario:', r5.rowCount);
    
    await client.query('COMMIT');
    console.log('🎉 Usuario reseteado completamente');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
});
\""
