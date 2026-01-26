// 🧹 Limpieza de reservas Hot Desk de hoy (testing)
import databaseService from './src/database/database.js';

console.log('🧹 LIMPIEZA DE HOT DESKS DE HOY\n');
console.log('═══════════════════════════════════════════════\n');

async function limpiarHotDesksHoy() {
  await databaseService.initialize();

  const hoy = '2026-01-26';

  // Mostrar reservas antes de eliminar
  console.log('📊 Reservas de Hot Desk hoy:\n');
  const reservasHoy = await databaseService.all(
    `SELECT id, user_phone, service_type, date, start_time, status, created_at 
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
    console.log(`     Creada: ${r.created_at}\n`);
  });

  // Eliminar
  console.log('🗑️  Eliminando...\n');
  const result = await databaseService.run(
    `DELETE FROM reservations 
     WHERE date = ? 
     AND service_type = 'hotDesk'`,
    [hoy]
  );

  console.log(`✅ ${result.changes} reservas de Hot Desk eliminadas\n`);
  console.log('✅ LIMPIEZA COMPLETADA - Espacio libre para clientes reales 🎯\n');

  process.exit(0);
}

limpiarHotDesksHoy();
