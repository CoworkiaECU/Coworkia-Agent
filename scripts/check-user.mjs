import { databaseService } from '../src/database/database.js';

const phone = '+593987770788';

const user = await databaseService.get(
  'SELECT phone_number, name, free_trial_used, free_trial_date, first_visit, conversation_count FROM users WHERE phone_number = $1',
  [phone]
);
console.log('=== USER ===');
console.log(JSON.stringify(user, null, 2));

const reservations = await databaseService.all(
  `SELECT id, service_type, date, start_time, end_time, status, was_free, payment_method, created_at 
   FROM reservations WHERE user_phone = $1 ORDER BY created_at DESC LIMIT 10`,
  [phone]
);
console.log('\n=== RESERVATIONS ===');
console.log(JSON.stringify(reservations, null, 2));

process.exit(0);
