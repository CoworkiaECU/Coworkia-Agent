#!/usr/bin/env node
/**
 * 🧹 Script para limpiar datos de un usuario específico
 */

import databaseService from '../../src/database/database.js';

const userPhone = process.argv[2] || '+593987770788';

async function cleanUserData() {
  try {
    console.log(`🧹 Limpiando datos de ${userPhone}...`);
    
    await databaseService.initialize();
    
    // Eliminar de cada tabla
    await databaseService.run('DELETE FROM reservation_state WHERE user_phone = $1', [userPhone]);
    console.log('✅ reservation_state limpiado');
    
    await databaseService.run('DELETE FROM partial_forms WHERE user_phone = $1', [userPhone]);
    console.log('✅ partial_forms limpiado');
    
    await databaseService.run('DELETE FROM interactions WHERE user_phone = $1', [userPhone]);
    console.log('✅ interactions limpiado');
    
    await databaseService.run('DELETE FROM pending_confirmations WHERE user_phone = $1', [userPhone]);
    console.log('✅ pending_confirmations limpiado');
    
    await databaseService.run('DELETE FROM reservations WHERE user_phone = $1', [userPhone]);
    console.log('✅ reservations limpiado');
    
    await databaseService.run('DELETE FROM users WHERE phone_number = $1', [userPhone]);
    console.log('✅ users limpiado');
    
    console.log(`\n🎉 Datos de ${userPhone} eliminados completamente`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
    process.exit(1);
  }
}

cleanUserData();
