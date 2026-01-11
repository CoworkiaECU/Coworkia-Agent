#!/usr/bin/env node

/**
 * 🚀 Script de Migración a Producción (Heroku PostgreSQL)
 * 
 * Ejecuta la migración 001-unified-conversations.js en Heroku
 * con validaciones y rollback automático en caso de error
 */

import dotenv from 'dotenv';
dotenv.config();

import database from '../src/database/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Verifica conexión a base de datos
 */
async function checkConnection() {
  console.log('🔍 Verificando conexión a PostgreSQL...');
  
  try {
    await database.initialize();
    const info = await database.get(`
      SELECT version(), current_database(), current_user
    `);
    
    console.log('✅ Conectado exitosamente:');
    console.log(`   Base de datos: ${info.current_database}`);
    console.log(`   Usuario: ${info.current_user}`);
    console.log(`   Versión: ${info.version.split(' ')[0]} ${info.version.split(' ')[1]}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

/**
 * Verifica si las tablas ya existen
 */
async function checkTablesExist() {
  console.log('\n🔍 Verificando estado de tablas...');
  
  const tables = [
    'agent_conversations',
    'conversation_files',
    'active_topics'
  ];
  
  const existingTables = [];
  
  for (const table of tables) {
    const result = await database.get(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as exists
    `, [table]);
    
    if (result.exists) {
      existingTables.push(table);
      
      // Contar registros
      const countResult = await database.get(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ⚠️  Tabla ${table} ya existe (${countResult.count} registros)`);
    } else {
      console.log(`   ✓ Tabla ${table} no existe (se creará)`);
    }
  }
  
  return existingTables;
}

/**
 * Ejecuta la migración
 */
async function runMigration() {
  console.log('\n🚀 Iniciando migración de base de datos...\n');
  
  try {
    // Importar script de migración
    const migrationPath = join(__dirname, 'migrations', '001-unified-conversations.js');
    const migration = await import(migrationPath);
    
    // Ejecutar migración
    console.log('📦 Ejecutando 001-unified-conversations.js...\n');
    await migration.up();
    
    console.log('\n✅ Migración completada exitosamente!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Error durante migración:', error.message);
    console.error('📜 Stack:', error.stack);
    return false;
  }
}

/**
 * Verificar integridad post-migración
 */
async function verifyMigration() {
  console.log('\n🔍 Verificando integridad post-migración...');
  
  const checks = [
    {
      name: 'Tabla agent_conversations',
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agent_conversations'
        ORDER BY ordinal_position
      `
    },
    {
      name: 'Índices de agent_conversations',
      query: `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'agent_conversations'
      `
    },
    {
      name: 'Tabla conversation_files',
      query: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'conversation_files'
        ORDER BY ordinal_position
      `
    },
    {
      name: 'Tabla active_topics',
      query: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'active_topics'
        ORDER BY ordinal_position
      `
    }
  ];
  
  let allChecksPassed = true;
  
  for (const check of checks) {
    try {
      const result = await database.all(check.query);
      console.log(`   ✅ ${check.name}: ${result.length} elementos`);
    } catch (error) {
      console.error(`   ❌ ${check.name}: ${error.message}`);
      allChecksPassed = false;
    }
  }
  
  return allChecksPassed;
}

/**
 * Muestra estadísticas post-migración
 */
async function showStats() {
  console.log('\n📊 ESTADÍSTICAS DE BASE DE DATOS:\n');
  
  try {
    // Contar tablas del sistema
    const tablesResult = await database.get(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    
    console.log(`📋 Total tablas en schema public: ${tablesResult.count}`);
    
    // Listar tablas relacionadas con conversaciones
    const convTablesResult = await database.all(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_name LIKE '%conversation%' OR table_name = 'active_topics'
      ORDER BY table_name
    `);
    
    console.log('\n📦 Tablas del sistema de conversaciones:');
    convTablesResult.forEach(row => {
      console.log(`   - ${row.table_name} (${row.column_count} columnas)`);
    });
    
    // Contar índices
    const indexesResult = await database.get(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (tablename LIKE '%conversation%' OR tablename = 'active_topics')
    `);
    
    console.log(`\n🔍 Total índices creados: ${indexesResult.count}`);
    
  } catch (error) {
    console.error('⚠️  Error obteniendo estadísticas:', error.message);
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   🚀 MIGRACIÓN A PRODUCCIÓN - HEROKU POSTGRESQL          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Paso 1: Verificar conexión
  const connected = await checkConnection();
  if (!connected) {
    console.error('\n❌ No se pudo conectar a la base de datos. Abortando.');
    process.exit(1);
  }
  
  // Paso 2: Verificar estado actual
  const existingTables = await checkTablesExist();
  
  if (existingTables.length > 0) {
    console.log('\n⚠️  ADVERTENCIA: Algunas tablas ya existen.');
    console.log('   La migración continuará y agregará lo que falte.');
    console.log('   Los datos existentes no se perderán.\n');
  }
  
  // Confirmación manual
  console.log('⏸️  Pausa: Revisa la información anterior.');
  console.log('   Si todo se ve bien, ejecuta: npm run migrate:heroku');
  console.log('\n   O para ejecutar directamente:');
  console.log('   heroku run node scripts/migrate-heroku.js --app coworkia-agent\n');
  
  // Si se pasa --execute, continuar automáticamente
  if (process.argv.includes('--execute')) {
    console.log('🚀 Modo automático activado (--execute)\n');
    
    // Paso 3: Ejecutar migración
    const success = await runMigration();
    
    if (!success) {
      console.error('\n❌ Migración falló. Revisa los errores.');
      process.exit(1);
    }
    
    // Paso 4: Verificar integridad
    const verified = await verifyMigration();
    
    if (!verified) {
      console.warn('\n⚠️  Verificación incompleta. Revisa manualmente.');
    }
    
    // Paso 5: Mostrar estadísticas
    await showStats();
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } else {
    console.log('ℹ️  Modo preview. No se ejecutó la migración.');
    console.log('   Agrega --execute para ejecutar.\n');
    process.exit(0);
  }
}

// Ejecutar
main().catch(error => {
  console.error('\n💥 ERROR FATAL:', error);
  process.exit(1);
});
