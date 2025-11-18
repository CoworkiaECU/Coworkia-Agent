/**
 * 🔧 Migración: Agregar columnas para tracking de Hot Desks
 * Agrega: hot_desk_number, payment_method, calendar_event_id
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function migrate() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Verificar columnas existentes
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `);
    
    const existingColumns = checkColumns.rows.map(r => r.column_name);
    console.log('📋 Columnas actuales:', existingColumns);
    
    // Agregar hot_desk_number si no existe
    if (!existingColumns.includes('hot_desk_number')) {
      await client.query('ALTER TABLE reservations ADD COLUMN hot_desk_number INTEGER');
      console.log('✅ Agregada columna: hot_desk_number');
    } else {
      console.log('⏭️  Columna hot_desk_number ya existe');
    }
    
    // Agregar payment_method si no existe
    if (!existingColumns.includes('payment_method')) {
      await client.query('ALTER TABLE reservations ADD COLUMN payment_method TEXT');
      console.log('✅ Agregada columna: payment_method');
    } else {
      console.log('⏭️  Columna payment_method ya existe');
    }
    
    // Agregar calendar_event_id si no existe
    if (!existingColumns.includes('calendar_event_id')) {
      await client.query('ALTER TABLE reservations ADD COLUMN calendar_event_id TEXT');
      console.log('✅ Agregada columna: calendar_event_id');
    } else {
      console.log('⏭️  Columna calendar_event_id ya existe');
    }
    
    // Verificar resultado
    const finalColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columnas finales:', finalColumns.rows.map(r => r.column_name).join(', '));
    
    await client.end();
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrate();
