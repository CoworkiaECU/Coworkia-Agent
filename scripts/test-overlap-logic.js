/**
 * 🧪 Test simplificado: verificar lógica de solapamiento
 */

import databaseService from '../src/database/database.js';
import reservationRepository from '../src/database/reservationRepository.js';

(async () => {
  await databaseService.initialize();
  
  const testDate = '2025-11-26';
  const testStart = '14:00';
  const testEnd = '16:00';
  
  console.log('🧪 TEST: Crear 3 reservas y verificar conteo\n');
  
  // Crear usuarios
  for (let i = 1; i <= 3; i++) {
    await databaseService.run(
      'INSERT OR REPLACE INTO users (phone_number, name) VALUES (?, ?)',
      [`+simple${i}`, `Simple ${i}`]
    );
  }
  
  // Crear 3 reservas directamente en la BD
  for (let i = 1; i <= 3; i++) {
    await databaseService.run(`
      INSERT INTO reservations (
        id, user_phone, service_type, date, start_time, end_time,
        duration_hours, status, hot_desk_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `test_simple_${i}`,
      `+simple${i}`,
      'hotDesk',
      testDate,
      testStart,
      testEnd,
      2,
      'confirmed',
      i
    ]);
    console.log(`✅ Reserva ${i} creada - Hot Desk ${i}/6`);
  }
  
  // Verificar con query directa
  console.log('\n📊 Verificación directa:');
  const direct = await databaseService.all(`
    SELECT hot_desk_number, status, date, start_time, end_time
    FROM reservations 
    WHERE service_type = 'hotDesk' 
      AND status = 'confirmed'
      AND date = '${testDate}'
  `);
  console.log(`Encontradas: ${direct.length}`);
  direct.forEach(r => console.log(`  - Desk ${r.hot_desk_number}: ${r.start_time}-${r.end_time}, status=${r.status}`));
  
  // Verificar con countOccupiedHotDesks
  console.log('\n📊 Verificación con countOccupiedHotDesks:');
  const count = await reservationRepository.countOccupiedHotDesks(testDate, testStart, testEnd);
  console.log('Resultado:', JSON.stringify(count, null, 2));
  
  // Limpiar
  await databaseService.run(`DELETE FROM reservations WHERE id LIKE 'test_simple%'`);
  await databaseService.run(`DELETE FROM users WHERE phone_number LIKE '+simple%'`);
  
  console.log('\n✅ Test completado');
  process.exit(0);
})();
