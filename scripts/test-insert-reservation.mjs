// Quick test: Can we create a meeting room reservation with durationHours = 5.5?
import databaseService from "../src/database/database.js";

await databaseService.initialize();

try {
  // Test INSERT with 5.5 duration into INTEGER column
  const result = await databaseService.run(
    `INSERT INTO reservations (id, user_phone, service_type, date, start_time, end_time, duration_hours, guest_count, total_price, was_free, status, payment_status, payment_data, hot_desk_number, payment_method, calendar_event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    ['TEST-DEBUG-001', '+593987770788', 'meetingRoom', '2026-03-30', '13:30', '19:00',
     5.5, 0, 0, false, 'pending', 'pending', null, null, 'efectivo', null]
  );
  console.log('INSERT SUCCESS:', result);
  
  // Clean up test data
  await databaseService.run("DELETE FROM reservations WHERE id = 'TEST-DEBUG-001'");
  console.log('CLEANUP done');
} catch (error) {
  console.log('INSERT ERROR:', error.message);
  console.log('ERROR CODE:', error.code);
}

process.exit(0);
