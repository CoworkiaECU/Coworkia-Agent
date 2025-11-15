/**
 * Script de migración para agregar campo active_agent a usuarios
 */

import databaseService from '../src/database/database.js';

async function migrate() {
  try {
    console.log('[MIGRATION] Iniciando migración...');
    
    await databaseService.initialize();
    
    // Verificar si la columna ya existe
    const result = await databaseService.get(`PRAGMA table_info(users)`);
    const hasActiveAgent = result && result.name === 'active_agent';
    
    if (!hasActiveAgent) {
      console.log('[MIGRATION] Agregando columna active_agent...');
      await databaseService.run(`
        ALTER TABLE users 
        ADD COLUMN active_agent TEXT DEFAULT 'AURORA'
      `);
      console.log('[MIGRATION] ✅ Columna active_agent agregada');
    } else {
      console.log('[MIGRATION] ℹ️ Columna active_agent ya existe');
    }
    
    // Actualizar usuarios existentes sin active_agent
    await databaseService.run(`
      UPDATE users 
      SET active_agent = 'AURORA' 
      WHERE active_agent IS NULL
    `);
    
    console.log('[MIGRATION] ✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION] ❌ Error en migración:', error);
    process.exit(1);
  }
}

migrate();
