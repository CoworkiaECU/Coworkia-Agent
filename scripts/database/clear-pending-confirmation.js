#!/usr/bin/env node
/**
 * 🧹 Script para limpiar confirmación pendiente de un usuario
 * Uso: node scripts/clear-pending-confirmation.js +593987770788
 */

import databaseService from '../../src/database/database.js';
import { clearPendingConfirmation } from '../../src/servicios/reservation-state.js';

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Uso: node scripts/clear-pending-confirmation.js <userId>');
  console.error('   Ejemplo: node scripts/clear-pending-confirmation.js +593987770788');
  process.exit(1);
}

async function main() {
  try {
    console.log(`🔍 Limpiando confirmación pendiente para: ${userId}`);
    
    // Inicializar base de datos
    await databaseService.initDatabase();
    
    // Limpiar pending confirmation
    clearPendingConfirmation(userId);
    
    console.log(`✅ Confirmación pendiente eliminada para ${userId}`);
    
    // Verificar que se limpió
    const db = databaseService.getConnection();
    const pending = db.prepare('SELECT * FROM pending_confirmations WHERE user_id = ?').get(userId);
    
    if (pending) {
      console.log('⚠️  ADVERTENCIA: Aún hay confirmación pendiente:', pending);
    } else {
      console.log('✅ Verificado: No hay confirmaciones pendientes');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
