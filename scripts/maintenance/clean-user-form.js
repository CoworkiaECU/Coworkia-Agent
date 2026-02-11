#!/usr/bin/env node
/**
 * 🧹 Script para limpiar formularios corruptos de usuarios
 * Uso: node scripts/maintenance/clean-user-form.js +593987770788
 */

import databaseService from '../../src/database/database.js';

const userPhone = process.argv[2];

if (!userPhone) {
  console.error('❌ Error: Debes especificar un número de teléfono');
  console.log('Uso: node scripts/maintenance/clean-user-form.js +593987770788');
  process.exit(1);
}

async function cleanUserForm() {
  try {
    console.log(`🧹 Limpiando formulario para ${userPhone}...`);
    
    // Inicializar BD
    await databaseService.initialize();
    
    // Eliminar formulario activo
    const result = await databaseService.run(
      'DELETE FROM agent_forms WHERE user_phone = $1',
      [userPhone]
    );
    
    console.log(`✅ Formulario eliminado: ${result.rowCount} rows`);
    
    // Opcional: Eliminar confirmaciones pendientes también
    const confirmResult = await databaseService.run(
      'DELETE FROM pending_confirmations WHERE user_phone = $1',
      [userPhone]
    );
    
    console.log(`✅ Confirmaciones pendientes eliminadas: ${confirmResult.rowCount} rows`);
    
    // Verificar estado final
    const remaining = await databaseService.get(
      'SELECT COUNT(*) as total FROM agent_forms WHERE user_phone = $1',
      [userPhone]
    );
    
    console.log(`📊 Formularios restantes para ${userPhone}: ${remaining.total}`);
    
    if (remaining.total === 0) {
      console.log('🎉 Usuario limpio - puede empezar conversación nueva');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando formulario:', error);
    process.exit(1);
  }
}

cleanUserForm();
