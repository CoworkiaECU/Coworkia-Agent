#!/usr/bin/env node
/**
 * 🔧 MIGRATION: Crear tabla axel_quotes
 * Ejecuta la migración de base de datos para el sistema de cotizaciones
 */

import databaseService, { getClient } from '../../src/database/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔧 ════════════════════════════════════════════════');
  console.log('   MIGRATION: Crear tabla axel_quotes');
  console.log('════════════════════════════════════════════════\n');

  // Inicializar base de datos
  await databaseService.initialize();
  const client = await getClient();

  try {
    // Leer archivo SQL
    const sqlPath = path.join(__dirname, 'migrations', 'create-axel-quotes-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Ejecutando SQL migration...\n');
    
    // Ejecutar SQL
    await client.query(sql);

    console.log('✅ Tabla axel_quotes creada exitosamente');
    console.log('✅ Índices creados');
    console.log('✅ Trigger updated_at configurado');
    
    // Verificar tabla
    const checkTable = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'axel_quotes'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESTRUCTURA DE LA TABLA:');
    console.log('────────────────────────────────────────');
    checkTable.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    console.log('\n✅ Migration completada exitosamente!\n');

  } catch (error) {
    if (error.code === '42P07') {
      console.log('ℹ️  Tabla ya existe, verificando estructura...');
      
      const checkTable = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'axel_quotes'
        ORDER BY ordinal_position
      `);

      console.log(`\n✅ Tabla existente con ${checkTable.rows.length} columnas\n`);
    } else {
      console.error('❌ Error ejecutando migration:', error.message);
      console.error(error);
      process.exit(1);
    }
  } finally {
    await client.release();
  }
}

runMigration().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
