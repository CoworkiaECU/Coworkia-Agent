/**
 * 📅 Crear eventos de calendario para desks permanentes (Diego + Francisco)
 * Ejecutar: heroku run "node scripts/calendar-permanent-desks.mjs" --app coworkia-agent
 */
import { blockMembershipCalendar } from '../src/servicios/google-calendar.js';

async function main() {
  console.log('📅 Creando eventos de calendario para desks permanentes...\n');

  // Diego Villota — Desk #1
  console.log('👤 Diego Villota — Desk #1');
  const diegoResult = await blockMembershipCalendar({
    clientName: 'Diego Villota',
    membershipType: 'Fundador — Desk Permanente #1',
    startDate: new Date().toISOString(),
    membershipCode: 'PERM-DESK-001-DIEGO'
  });
  console.log(`   → ${diegoResult.created}/${diegoResult.total} días creados\n`);

  // Francisco Zapata — Desk #2
  console.log('👤 Francisco Zapata — Desk #2');
  const franResult = await blockMembershipCalendar({
    clientName: 'Francisco Zapata',
    membershipType: 'Plan 20 — Desk Permanente #2',
    startDate: new Date().toISOString(),
    membershipCode: 'PERM-DESK-002-FRANCISCO'
  });
  console.log(`   → ${franResult.created}/${franResult.total} días creados\n`);

  console.log('✅ Calendario actualizado');
  console.log('🔒 Desks #1 y #2 bloqueados L-V 08:30-19:00 hasta fin de mes');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
