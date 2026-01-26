/**
 * 🧹 Script de limpieza para números de prueba
 * Limpia BD sin cerrar el pool (usa process.exit en lugar de pool.end)
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const testNumbers = ['+593987770788', '+593992320262'];

async function limpiarTest() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Limpiando números de prueba:', testNumbers.join(', '));
    
    // 0. Limpiar reservations PRIMERO (foreign key constraint)
    const reservationsResult = await client.query(
      'DELETE FROM reservations WHERE phone_number = ANY($1::text[]) RETURNING id',
      [testNumbers]
    );
    console.log(`✅ Reservations eliminadas: ${reservationsResult.rowCount}`);
    
    // 1. Limpiar users
    const usersResult = await client.query(
      'DELETE FROM users WHERE phone_number = ANY($1::text[]) RETURNING phone_number',
      [testNumbers]
    );
    console.log(`✅ Users eliminados: ${usersResult.rowCount}`);
    
    // 2. Limpiar partial_forms
    const formsResult = await client.query(
      'DELETE FROM partial_forms WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ Forms eliminados: ${formsResult.rowCount}`);
    
    // 3. Limpiar reservation_state
    const stateResult = await client.query(
      'DELETE FROM reservation_state WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ States eliminados: ${stateResult.rowCount}`);
    
    // 4. Limpiar interactions
    const interactionsResult = await client.query(
      'DELETE FROM interactions WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ Interactions eliminadas: ${interactionsResult.rowCount}`);
    
    // 5. Limpiar pending_confirmations
    const confirmationsResult = await client.query(
      'DELETE FROM pending_confirmations WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ Confirmations eliminadas: ${confirmationsResult.rowCount}`);
    
    console.log('\n✨ BD limpiada exitosamente - Lista para pruebas v621\n');
    
  } catch (error) {
    console.error('❌ Error limpiando BD:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0); // ← Salir limpiamente SIN cerrar pool
  }
}

limpiarTest();
