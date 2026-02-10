/**
 * 🧹 LIMPIEZA TOTAL DE BASE DE DATOS
 * 
 * ⚠️  PELIGRO: Elimina TODOS los datos de usuarios
 * 
 * USO: Solo para ambiente DEMO
 * RAZÓN: Reset completo antes de desarrollo definitivo
 * PRESERVA: Estructura de tablas (schema)
 * ELIMINA: Todos los registros de todas las tablas
 */

import pg from 'pg';
const { Pool } = pg;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1) CONEXIÓN A POSTGRESQL (HEROKU)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('\n🔥 LIMPIEZA TOTAL DE BASE DE DATOS - MODO DEMO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2) AUDITORÍA PRE-LIMPIEZA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function auditarDatos() {
  console.log('📊 DATOS ACTUALES EN BASE:\n');
  
  const tablas = [
    'users',
    'interactions', 
    'conversation_history',
    'reservations',
    'agent_forms',
    'pending_confirmations'
  ];
  
  const stats = {};
  
  for (const tabla of tablas) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as total FROM ${tabla}`);
      const total = parseInt(result.rows[0].total);
      stats[tabla] = total;
      console.log(`  📦 ${tabla.padEnd(25)} ${total.toString().padStart(6)} registros`);
    } catch (error) {
      stats[tabla] = 0;
      console.log(`  ⚠️  ${tabla.padEnd(25)} (tabla no existe)`);
    }
  }
  
  console.log('\n');
  return stats;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3) LIMPIEZA COMPLETA (orden correcto por dependencias)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function limpiarTodo() {
  console.log('🧹 ELIMINANDO TODOS LOS DATOS...\n');
  
  // Orden: de dependientes a principales
  const queries = [
    { tabla: 'conversation_history', sql: 'DELETE FROM conversation_history' },
    { tabla: 'interactions', sql: 'DELETE FROM interactions' },
    { tabla: 'agent_forms', sql: 'DELETE FROM agent_forms' },
    { tabla: 'pending_confirmations', sql: 'DELETE FROM pending_confirmations' },
    { tabla: 'reservations', sql: 'DELETE FROM reservations' },
    { tabla: 'users', sql: 'DELETE FROM users' }
  ];
  
  const resultados = {};
  
  for (const { tabla, sql } of queries) {
    try {
      const result = await pool.query(sql);
      const eliminados = result.rowCount || 0;
      resultados[tabla] = eliminados;
      console.log(`  ✅ ${tabla.padEnd(25)} ${eliminados.toString().padStart(6)} registros eliminados`);
    } catch (error) {
      resultados[tabla] = 'ERROR';
      console.log(`  ❌ ${tabla.padEnd(25)} Error: ${error.message}`);
    }
  }
  
  console.log('\n');
  return resultados;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4) VERIFICACIÓN POST-LIMPIEZA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function verificarLimpieza() {
  console.log('🔍 VERIFICACIÓN POST-LIMPIEZA:\n');
  
  const tablas = [
    'users',
    'interactions',
    'conversation_history', 
    'reservations',
    'agent_forms',
    'pending_confirmations'
  ];
  
  let todoVacio = true;
  
  for (const tabla of tablas) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as total FROM ${tabla}`);
      const total = parseInt(result.rows[0].total);
      
      if (total === 0) {
        console.log(`  ✅ ${tabla.padEnd(25)} 0 registros (vacío)`);
      } else {
        console.log(`  ⚠️  ${tabla.padEnd(25)} ${total} registros (NO VACÍO)`);
        todoVacio = false;
      }
    } catch (error) {
      console.log(`  ⚠️  ${tabla.padEnd(25)} Error verificando`);
    }
  }
  
  console.log('\n');
  return todoVacio;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5) EJECUCIÓN PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  try {
    // Pre-limpieza
    const statsAntes = await auditarDatos();
    
    // Limpieza
    const resultados = await limpiarTodo();
    
    // Post-verificación
    const todoLimpio = await verificarLimpieza();
    
    // Resumen final
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    if (todoLimpio) {
      console.log('✅ BASE DE DATOS COMPLETAMENTE LIMPIA');
      console.log('🎯 Lista para desarrollo de sistema definitivo');
      console.log('💎 Preparada para comercialización premium\n');
    } else {
      console.log('⚠️  ADVERTENCIA: Algunos registros persisten');
      console.log('🔍 Revisar logs arriba para detalles\n');
    }
    
  } catch (error) {
    console.error('❌ ERROR FATAL:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a BD cerrada\n');
  }
}

// Ejecutar
main();
