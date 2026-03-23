// Script para verificar y corregir el estado del free trial de un usuario
import databaseService from '../src/database/database.js';

const phone = '+593987770788';

await databaseService.initialize();

// 1. Ver estado actual
const user = await databaseService.get(
  'SELECT phone_number, name, free_trial_used, free_trial_date, first_visit FROM users WHERE phone_number = $1',
  [phone]
);
console.log('=== ESTADO ACTUAL ===');
console.log(JSON.stringify(user, null, 2));

// 2. Ver reservas (buscar si alguna fue gratis/primera visita)
const reservations = await databaseService.all(
  `SELECT id, service_type, date, start_time, end_time, status, was_free, payment_method, total_price, created_at 
   FROM reservations WHERE user_phone = $1 ORDER BY created_at DESC`,
  [phone]
);
console.log('\n=== RESERVAS ===');
console.log(JSON.stringify(reservations, null, 2));

// 3. Corregir: marcar free_trial_used = 1 si hay reserva con was_free = true
const freeReservation = reservations.find(r => r.was_free == true || r.was_free == 1);
if (freeReservation) {
  console.log('\n🎁 Reserva gratis encontrada:', freeReservation.id);
  await databaseService.run(
    `UPDATE users SET free_trial_used = true, free_trial_date = $1 WHERE phone_number = $2`,
    [freeReservation.created_at, phone]
  );
  console.log('✅ free_trial_used corregido a 1');
} else if (user && user.free_trial_used == 0) {
  console.log('\n⚠️  No hay reserva was_free=true — revisando por reservas confirmadas Hot Desk...');
  const confirmedHotDesk = reservations.find(r => r.service_type === 'hotDesk' && (r.status === 'confirmed' || r.status === 'pending_payment'));
  if (confirmedHotDesk) {
    console.log('🏢 Reserva Hot Desk confirmada encontrada:', confirmedHotDesk.id, '— marcando trial como usado');
    await databaseService.run(
      `UPDATE users SET free_trial_used = true, free_trial_date = $1 WHERE phone_number = $2`,
      [confirmedHotDesk.created_at, phone]
    );
    console.log('✅ free_trial_used corregido a true');
  }
}

// 4. Verificar estado final
const userAfter = await databaseService.get(
  'SELECT phone_number, name, free_trial_used, free_trial_date FROM users WHERE phone_number = $1',
  [phone]
);
console.log('\n=== ESTADO FINAL ===');
console.log(JSON.stringify(userAfter, null, 2));

process.exit(0);
