#!/usr/bin/env node
/**
 * Script para limpiar toda la base de datos
 * Uso: node scripts/clear-database.js
 */

import databaseService from '../src/database/database.js';

async function clearDatabase() {
  try {
    console.log('🗑️  Limpiando base de datos...');
    
    await databaseService.initialize();
    
    const tables = [
      'interactions',
      'conversation_history',
      'reservation_state',
      'pending_confirmations',
      'reservations',
      'users'
    ];
    
    for (const table of tables) {
      console.log(`   Limpiando tabla: ${table}`);
      await databaseService.run(`DELETE FROM ${table}`);
    }
    
    console.log('✅ Base de datos limpiada exitosamente');
    console.log('📊 Todas las tablas vaciadas:');
    tables.forEach(t => console.log(`   - ${t}`));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
    process.exit(1);
  }
}

clearDatabase();
