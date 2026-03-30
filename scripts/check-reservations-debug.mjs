import databaseService from "../src/database/database.js";

await databaseService.initialize();

const rows = await databaseService.all(
  "SELECT id, user_phone, service_type, date, start_time, end_time, status FROM reservations WHERE date = '2026-03-30' ORDER BY created_at DESC"
);
console.log("=== RESERVATIONS 2026-03-30 ===");
rows.forEach(r => console.log(JSON.stringify(r)));

const pending = await databaseService.all(
  "SELECT user_phone, LEFT(reservation_data::text, 300) as data_preview, expires_at FROM pending_confirmations"
);
console.log("\n=== PENDING CONFIRMATIONS ===");
pending.forEach(r => console.log(JSON.stringify(r)));

process.exit(0);
