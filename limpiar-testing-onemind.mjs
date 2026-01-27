// 🧹 LIMPIEZA AGRESIVA - NÚMEROS DE PRUEBA ONEMIND
// Borra TODO: usuarios, reservas, formularios, interacciones, historial
// Uso: node limpiar-testing-onemind.mjs

import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Números de prueba OneMind
const PHONES = ['+593987770788', '+593992320262'];

console.log('🧹 LIMPIEZA AGRESIVA - NÚMEROS DE PRUEBA ONEMIND\n');
console.log('═══════════════════════════════════════════════\n');
console.log(`📱 Números: ${PHONES.join(', ')}\n`);

async function limpiarTesting() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Interactions (historial completo)
    console.log('1️⃣ Limpiando historial de interacciones...');
    const r1 = await client.query(
      'DELETE FROM interactions WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r1.rowCount} interacciones eliminadas\n`);
    
    // 2. Pending confirmations
    console.log('2️⃣ Limpiando confirmaciones pendientes...');
    const r2 = await client.query(
      'DELETE FROM pending_confirmations WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r2.rowCount} confirmaciones eliminadas\n`);
    
    // 3. Reservation state
    console.log('3️⃣ Limpiando reservation_state...');
    const r3 = await client.query(
      'DELETE FROM reservation_state WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r3.rowCount} estados eliminados\n`);
    
    // 4. Agent forms
    console.log('4️⃣ Limpiando agent_forms...');
    const r4 = await client.query(
      'DELETE FROM agent_forms WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r4.rowCount} formularios eliminados\n`);
    
    // 5. Partial forms (legacy)
    console.log('5️⃣ Limpiando partial_forms...');
    const r5 = await client.query(
      'DELETE FROM partial_forms WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r5.rowCount} formularios parciales eliminados\n`);
    
    // 6. Aurora partial reservations
    console.log('6️⃣ Limpiando aurora_partial_reservations...');
    const r6 = await client.query(
      'DELETE FROM aurora_partial_reservations WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r6.rowCount} reservas parciales Aurora eliminadas\n`);
    
    // 7. Aluna partial memberships
    console.log('7️⃣ Limpiando aluna_partial_memberships...');
    const r7 = await client.query(
      'DELETE FROM aluna_partial_memberships WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r7.rowCount} membresías parciales Aluna eliminadas\n`);
    
    // 8. Reservations (TODAS - confirmadas, pendientes, canceladas, etc)
    console.log('8️⃣ Limpiando TODAS las reservas...');
    const r8 = await client.query(
      'DELETE FROM reservations WHERE user_phone = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r8.rowCount} reservas eliminadas\n`);
    
    // 9. Users (ELIMINACIÓN COMPLETA)
    console.log('9️⃣ Eliminando usuarios completamente...');
    const r9 = await client.query(
      'DELETE FROM users WHERE phone_number = ANY($1)',
      [PHONES]
    );
    console.log(`   ✅ ${r9.rowCount} usuarios eliminados\n`);
    
    await client.query('COMMIT');
    
    console.log('═══════════════════════════════════════════════\n');
    console.log('✅ LIMPIEZA COMPLETADA - Sistema limpio para pruebas 🎯\n');
    console.log('Los números quedan como si NUNCA hubieran existido.\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    client.release();
    // 🚨 NO cerrar pool - Heroku lo necesita para el bot
    console.log('[LIMPIEZA] 🔌 Cliente liberado (pool sigue activo)\n');
    process.exit(0);
  }
}

limpiarTesting();
