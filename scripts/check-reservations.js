import databaseService from '../src/database/database.js';

(async () => {
  await databaseService.initialize();
  const results = await databaseService.all(
    "SELECT id, user_phone, status, hot_desk_number, date, start_time FROM reservations WHERE date = '2025-11-25' ORDER BY hot_desk_number"
  );
  console.log('Reservas encontradas:', results.length);
  results.forEach(r => console.log(`  - User: ${r.user_phone}, Desk: ${r.hot_desk_number}, Status: ${r.status}`));
  process.exit(0);
})();
