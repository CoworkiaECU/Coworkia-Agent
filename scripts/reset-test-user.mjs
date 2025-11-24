import { pool } from '../src/database/postgres-adapter.js';

const userId = '+593987770788';

async function resetUser() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Eliminar todas las reservas
    const deleteReservations = await client.query(
      'DELETE FROM reservations WHERE user_phone = $1',
      [userId]
    );
    console.log(`✅ Eliminadas ${deleteReservations.rowCount} reservas`);
    
    // 2. Limpiar pending_confirmations
    const deletePending = await client.query(
      'DELETE FROM pending_confirmations WHERE user_phone = $1',
      [userId]
    );
    console.log(`✅ Limpiado pending_confirmations: ${deletePending.rowCount}`);
    
    // 3. Limpiar partial_forms
    const deleteForms = await client.query(
      'DELETE FROM partial_forms WHERE user_phone = $1',
      [userId]
    );
    console.log(`✅ Limpiado partial_forms: ${deleteForms.rowCount}`);
    
    // 4. Limpiar reservation_state
    const deleteState = await client.query(
      'DELETE FROM reservation_state WHERE user_phone = $1',
      [userId]
    );
    console.log(`✅ Limpiado reservation_state: ${deleteState.rowCount}`);
    
    // 5. Resetear usuario a estado nuevo
    const updateUser = await client.query(
      'UPDATE users SET free_trial_used = false, free_trial_date = NULL WHERE phone_number = $1',
      [userId]
    );
    console.log(`✅ Usuario reseteado a CLIENTE NUEVO: ${updateUser.rowCount}`);
    
    await client.query('COMMIT');
    console.log('\n🎉 Usuario completamente reseteado. Ahora es CLIENTE NUEVO.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

resetUser();
