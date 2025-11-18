/**
 * 🔧 Fix: Eliminar índice UNIQUE y recrear como índice normal
 * Permite múltiples Hot Desks en el mismo slot (max 6)
 */

import databaseService from '../src/database/database.js';

async function fix() {
  try {
    await databaseService.initialize();
    console.log('✅ Conectado a la base de datos\n');
    
    console.log('🗑️  Eliminando índice UNIQUE...');
    await databaseService.run('DROP INDEX IF EXISTS idx_reservations_slot');
    console.log('✅ Índice UNIQUE eliminado\n');
    
    console.log('🔧 Recreando como índice normal...');
    await databaseService.run('CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(date, start_time, end_time, service_type)');
    console.log('✅ Índice normal recreado\n');
    
    console.log('✅ Fix completado exitosamente');
    console.log('   Ahora se permiten múltiples Hot Desks en el mismo slot\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fix();
