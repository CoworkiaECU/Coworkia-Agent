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
    
    // 0. Limpiar pending_confirmations PRIMERO (foreign key desde users)
    const pendingResult = await client.query(
      'DELETE FROM pending_confirmations WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ Confirmaciones eliminadas: ${pendingResult.rowCount}`);
    
    // 1. Limpiar agent_forms
    const agentFormsResult = await client.query(
      'DELETE FROM agent_forms WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ Agent forms eliminados: ${agentFormsResult.rowCount}`);
    
    // 2. Limpiar reservations
    const reservationsResult = await client.query(
      'DELETE FROM reservations WHERE user_phone = ANY($1::text[]) RETURNING id',
      [testNumbers]
    );
    console.log(`✅ Reservations eliminadas: ${reservationsResult.rowCount}`);
    
    // 3. Limpiar partial_forms (legacy)
    const formsResult = await client.query(
      'DELETE FROM partial_forms WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ Forms legacy eliminados: ${formsResult.rowCount}`);
    
    // 4. Limpiar reservation_state
    const stateResult = await client.query(
      'DELETE FROM reservation_state WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ States eliminados: ${stateResult.rowCount}`);
    
    // 5. Limpiar interactions
    const interactionsResult = await client.query(
      'DELETE FROM interactions WHERE user_phone = ANY($1::text[])',
      [testNumbers]
    );
    console.log(`✅ Interactions eliminadas: ${interactionsResult.rowCount}`);
    
    // 6. Limpiar users AL FINAL
    const usersResult = await client.query(
      'DELETE FROM users WHERE phone_number = ANY($1::text[]) RETURNING phone_number',
      [testNumbers]
    );
    console.log(`✅ Users eliminados: ${usersResult.rowCount}`);
    
    console.log('\n✨ BD limpiada - Lista para tests v634\n');
    
  } catch (error) {
    console.error('❌ Error limpiando BD:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0); // ← Salir limpiamente SIN cerrar pool
  }
}

limpiarTest();
