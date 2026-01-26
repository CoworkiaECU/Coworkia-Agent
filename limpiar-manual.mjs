import databaseService from './src/database/postgres-adapter.js';

const PHONES = ['+593987770788', '+593992320262'];

async function limpiarManual() {
  try {
    await databaseService.ensureInitialized();
    
    // 1. Confirmaciones
    await databaseService.run(
      `DELETE FROM pending_confirmations WHERE user_phone IN ($1, $2)`,
      PHONES
    );
    console.log('✅ Confirmaciones eliminadas');
    
    // 2. Agent forms
    await databaseService.run(
      `DELETE FROM agent_forms WHERE user_phone IN ($1, $2)`,
      PHONES
    );
    console.log('✅ Forms eliminados');
    
    // 3. Reservations
    await databaseService.run(
      `DELETE FROM reservations WHERE user_phone IN ($1, $2)`,
      PHONES
    );
    console.log('✅ Reservas eliminadas');
    
    // 4. Interactions
    await databaseService.run(
      `DELETE FROM interactions WHERE user_phone IN ($1, $2)`,
      PHONES
    );
    console.log('✅ Interactions eliminadas');
    
    // 5. Users
    await databaseService.run(
      `DELETE FROM users WHERE phone_number IN ($1, $2)`,
      PHONES
    );
    console.log('✅ Users eliminados');
    
    await databaseService.closePool();
    console.log('\n🎉 BD limpia - Lista para tests');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

limpiarManual();
