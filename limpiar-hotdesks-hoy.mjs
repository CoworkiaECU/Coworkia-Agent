// 🧹 Limpieza de reservas Hot Desk de hoy (testing)
import databaseService from './src/database/database.js';
import { deleteCalendarEvent } from './src/servicios/google-calendar.js';

console.log('🧹 LIMPIEZA DE HOT DESKS DE HOY\n');
console.log('═══════════════════════════════════════════════\n');

async function limpiarHotDesksHoy() {
  await databaseService.initialize();

  const hoy = '2026-01-26';

  // Mostrar reservas antes de eliminar
  console.log('📊 Reservas de Hot Desk hoy:\n');
  const reservasHoy = await databaseService.all(
    `SELECT id, user_phone, service_type, date, start_time, status, calendar_event_id, created_at 
     FROM reservations 
     WHERE date = ? 
     AND service_type = 'hotDesk'
     ORDER BY created_at DESC`,
    [hoy]
  );

  console.log(`   Total: ${reservasHoy.length} reservas\n`);
  reservasHoy.forEach(r => {
    console.log(`   - ID: ${r.id}`);
    console.log(`     Usuario: ${r.user_phone}`);
    console.log(`     Estado: ${r.status}`);
    console.log(`     Fecha: ${r.date} ${r.start_time}`);
    console.log(`     Google Calendar: ${r.calendar_event_id || 'Sin evento'}`);
    console.log(`     Creada: ${r.created_at}\n`);
  });

  // Eliminar eventos de Google Calendar primero
  console.log('🗓️  Eliminando eventos de Google Calendar...\n');
  let eventosEliminados = 0;
  for (const reserva of reservasHoy) {
    if (reserva.calendar_event_id) {
      try {
        await deleteCalendarEvent(reserva.calendar_event_id);
        console.log(`   ✅ Evento eliminado: ${reserva.calendar_event_id}`);
        eventosEliminados++;
      } catch (error) {
        console.log(`   ⚠️  Error eliminando evento ${reserva.calendar_event_id}: ${error.message}`);
      }
    }
  }
  console.log(`\n✅ ${eventosEliminados} eventos eliminados de Google Calendar\n`);

  // Eliminar de BD
  console.log('🗑️  Eliminando de base de datos...\n');
  const result = await databaseService.run(
    `DELETE FROM reservations 
     WHERE date = ? 
     AND service_type = 'hotDesk'`,
    [hoy]
  );

  console.log(`✅ ${result.changes} reservas de Hot Desk eliminadas de BD\n`);
  console.log('✅ LIMPIEZA COMPLETADA - Espacio libre para clientes reales 🎯\n');

  process.exit(0);
}

limpiarHotDesksHoy();
