/**
 * 🔧 Migración: Agregar columnas para tracking de Hot Desks
 * Agrega: hot_desk_number, payment_method, calendar_event_id
 * Soporta PostgreSQL (producción) y SQLite (desarrollo)
 */

import databaseService from '../src/database/database.js';

async function migrate() {
  try {
    await databaseService.initialize();
    console.log('✅ Conectado a la base de datos');
    
    // Detectar si es PostgreSQL o SQLite
    const isPostgres = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';
    
    let existingColumns = [];
    
    if (isPostgres) {
      // PostgreSQL: usar information_schema
      const checkColumns = await databaseService.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reservations'
      `);
      existingColumns = checkColumns ? [checkColumns.column_name] : [];
    } else {
      // SQLite: usar PRAGMA
      const pragma = await databaseService.all('PRAGMA table_info(reservations)');
      existingColumns = pragma.map(col => col.name);
    }
    
    console.log('📋 Columnas actuales:', existingColumns);
    
    // Agregar hot_desk_number si no existe
    if (!existingColumns.includes('hot_desk_number')) {
      await databaseService.run('ALTER TABLE reservations ADD COLUMN hot_desk_number INTEGER');
      console.log('✅ Agregada columna: hot_desk_number');
    } else {
      console.log('⏭️  Columna hot_desk_number ya existe');
    }
    
    // Agregar payment_method si no existe
    if (!existingColumns.includes('payment_method')) {
      await databaseService.run('ALTER TABLE reservations ADD COLUMN payment_method TEXT');
      console.log('✅ Agregada columna: payment_method');
    } else {
      console.log('⏭️  Columna payment_method ya existe');
    }
    
    // Agregar calendar_event_id si no existe
    if (!existingColumns.includes('calendar_event_id')) {
      await databaseService.run('ALTER TABLE reservations ADD COLUMN calendar_event_id TEXT');
      console.log('✅ Agregada columna: calendar_event_id');
    } else {
      console.log('⏭️  Columna calendar_event_id ya existe');
    }
    
    // Verificar resultado
    let finalColumns = [];
    if (isPostgres) {
      const result = await databaseService.all(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reservations'
        ORDER BY ordinal_position
      `);
      finalColumns = result.map(r => r.column_name);
    } else {
      const pragma = await databaseService.all('PRAGMA table_info(reservations)');
      finalColumns = pragma.map(col => col.name);
    }
    
    console.log('\n📋 Columnas finales:', finalColumns.join(', '));
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrate();
