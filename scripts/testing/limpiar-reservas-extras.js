// scripts/testing/limpiar-reservas-extras.js
// Elimina reservas extras dejando solo 6 por día

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

// Conectar directo a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('🧹 LIMPIANDO RESERVAS EXTRAS\n');
  
  // Obtener reservas por fecha
  const lunesQuery = await pool.query(
    `SELECT * FROM reservations WHERE date = $1 AND start_time = $2 AND service_type = $3 ORDER BY created_at`,
    ['2026-01-19', '09:00', 'hotDesk']
  );
  const martesQuery = await pool.query(
    `SELECT * FROM reservations WHERE date = $1 AND start_time = $2 AND service_type = $3 ORDER BY created_at`,
    ['2026-01-20', '09:00', 'hotDesk']
  );
  
  const lunes9am = lunesQuery.rows;
  const martes9am = martesQuery.rows;
  
  console.log(`📊 Estado actual:`);
  console.log(`   Lunes 19 enero 9 AM: ${lunes9am.length} reservas`);
  console.log(`   Martes 20 enero 9 AM: ${martes9am.length} reservas\n`);
  
  // Mantener solo las primeras 6 de cada día
  const eliminarLunes = lunes9am.slice(6);
  const eliminarMartes = martes9am.slice(6);
  
  console.log(`🗑️  A eliminar:`);
  console.log(`   Lunes: ${eliminarLunes.length} reservas`);
  console.log(`   Martes: ${eliminarMartes.length} reservas\n`);
  
  const todasEliminar = [...eliminarLunes, ...eliminarMartes];
  
  if (todasEliminar.length === 0) {
    console.log('✅ No hay reservas extras para eliminar');
    process.exit(0);
  }
  
  // Eliminar cada reserva
  for (const reserva of todasEliminar) {
    console.log(`\n🗑️  Eliminando: ${reserva.id}`);
    console.log(`   Usuario: ${reserva.user_phone}`);
    console.log(`   Fecha: ${reserva.date} ${reserva.start_time}`);
    console.log(`   Hot Desk: #${reserva.hot_desk_number}`);
    
    // Eliminar de PostgreSQL
    try {
      await pool.query('DELETE FROM reservations WHERE id = $1', [reserva.id]);
      console.log(`   ✅ Reserva eliminada de BD`);
      if (reserva.calendar_event_id) {
        console.log(`   ℹ️  Calendar Event: ${reserva.calendar_event_id}`);
      }
    } catch (err) {
      console.error(`   ❌ Error BD:`, err.message);
    }
  }
  
  await pool.end();
  
  console.log('\n\n✅ LIMPIEZA COMPLETADA');
  console.log(`📊 Quedan:`);
  console.log(`   Lunes 19 enero 9 AM: 6 reservas`);
  console.log(`   Martes 20 enero 9 AM: 6 reservas\n`);
  
  process.exit(0);
}

main();
