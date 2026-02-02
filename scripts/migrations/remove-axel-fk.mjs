#!/usr/bin/env node

/**
 * 🔧 MIGRACIÓN: Eliminar FK de axel_photo_sessions
 * Para permitir usuarios nuevos sin registro previo
 */

import postgresAdapter from '../../src/database/postgres-adapter.js';

async function migrate() {
  console.log('🔧 [MIGRACIÓN] Eliminando FK de axel_photo_sessions\n');
  
  try {
    await postgresAdapter.initialize();
    const pool = postgresAdapter.pool;
    const client = await pool.connect();
    
    try {
      // Verificar si existe la constraint
      const checkFK = await client.query(`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'axel_photo_sessions'::regclass 
          AND conname = 'axel_photo_sessions_user_phone_fkey'
      `);
      
      if (checkFK.rows.length > 0) {
        console.log('📌 FK encontrada, eliminando...');
        await client.query(`
          ALTER TABLE axel_photo_sessions 
          DROP CONSTRAINT axel_photo_sessions_user_phone_fkey
        `);
        console.log('✅ FK eliminada exitosamente\n');
      } else {
        console.log('✅ FK ya no existe (migración aplicada previamente)\n');
      }
      
    } finally {
      client.release();
    }
    
    console.log('🎉 Migración completada');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    if (postgresAdapter.pool) {
      await postgresAdapter.pool.end();
    }
    process.exit(0);
  }
}

migrate();
