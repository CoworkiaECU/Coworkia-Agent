#!/usr/bin/env node
/**
 * 🗑️ Limpieza de tablas obsoletas en PostgreSQL
 * Elimina tablas legacy que ya no se usan
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanupObsoleteTables() {
  console.log('🗑️  Iniciando limpieza de tablas obsoletas...\n');

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Verificar si existen las tablas
      console.log('📋 Verificando tablas obsoletas...');
      
      const tablesCheck = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('form_data', 'just_confirmed')
      `);

      if (tablesCheck.rows.length === 0) {
        console.log('✅ No hay tablas obsoletas para eliminar\n');
        await client.query('ROLLBACK');
        return;
      }

      console.log(`Tablas encontradas: ${tablesCheck.rows.map(r => r.tablename).join(', ')}\n`);

      // 2. Contar registros antes de eliminar
      for (const table of tablesCheck.rows) {
        const count = await client.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
        console.log(`  • ${table.tablename}: ${count.rows[0].count} registros`);
      }
      console.log('');

      // 3. Eliminar tablas
      console.log('🗑️  Eliminando tablas...');
      
      if (tablesCheck.rows.some(t => t.tablename === 'form_data')) {
        await client.query('DROP TABLE IF EXISTS form_data CASCADE');
        console.log('  ✅ Tabla form_data eliminada');
      }

      if (tablesCheck.rows.some(t => t.tablename === 'just_confirmed')) {
        await client.query('DROP TABLE IF EXISTS just_confirmed CASCADE');
        console.log('  ✅ Tabla just_confirmed eliminada');
      }

      await client.query('COMMIT');
      console.log('\n✅ Limpieza completada exitosamente');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error durante limpieza:', error);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupObsoleteTables();
