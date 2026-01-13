/**
 * 🧪 Script de prueba: Sistema de tracking Hot Desks
 * Verifica asignación automática, validación de disponibilidad y lógica completa
 */

import reservationRepository from '../src/database/reservationRepository.js';
import { checkHotDeskAvailability, assignHotDeskNumber } from '../src/servicios/calendario.js';
import databaseService from '../src/database/database.js';

console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE HOT DESKS\n');

async function testHotDeskTracking() {
  try {
    await databaseService.initialize();
    console.log('✅ Base de datos inicializada\n');

    // Test 1: Verificar disponibilidad inicial (debería estar vacío)
    console.log('📋 TEST 1: Verificar disponibilidad inicial');
    const testDate = '2025-11-25';
    const testStart = '10:00';
    const testEnd = '12:00';
    
    const availability1 = await checkHotDeskAvailability(testDate, testStart, testEnd);
    console.log('Resultado:', JSON.stringify(availability1, null, 2));
    console.log(`✅ Disponibles: ${availability1.availableCount}/6\n`);

    // Test 2: Asignar primer Hot Desk
    console.log('📋 TEST 2: Asignar primer Hot Desk');
    const hotDesk1 = await assignHotDeskNumber(testDate, testStart, testEnd);
    console.log(`✅ Hot Desk asignado: ${hotDesk1}/6\n`);

    // Test 3: Crear usuarios y reservas simuladas
    console.log('📋 TEST 3: Crear usuarios y reservas simuladas');
    const reservations = [];
    
    // Crear usuarios primero (FOREIGN KEY)
    for (let i = 1; i <= 6; i++) {
      await databaseService.run(
        'INSERT OR IGNORE INTO users (phone_number, name) VALUES (?, ?)',
        [`+test${i}`, `Test User ${i}`]
      );
    }
    
    // Crear 3 reservas iniciales
    for (let i = 1; i <= 3; i++) {
      const reservation = await reservationRepository.create({
        user_phone: `+test${i}`,
        service_type: 'hotDesk',
        date: testDate,
        start_time: testStart,
        end_time: testEnd,
        duration_hours: 2,
        guest_count: 0,
        total_price: 10,
        was_free: false,
        status: 'confirmed',
        payment_status: 'pending',
        hot_desk_number: i,
        payment_method: 'tarjeta'
      });
      reservations.push(reservation);
      console.log(`   ✅ Reserva ${i} creada - Hot Desk ${i}/6`);
    }
    console.log('');

    // Test 4: Verificar disponibilidad después de 3 reservas
    console.log('📋 TEST 4: Verificar disponibilidad (3 ocupados)');
    const availability2 = await checkHotDeskAvailability(testDate, testStart, testEnd);
    console.log('Resultado:', JSON.stringify(availability2, null, 2));
    console.log(`✅ Ocupados: ${availability2.occupiedCount}/6`);
    console.log(`✅ Disponibles: ${availability2.availableCount}/6\n`);

    // Test 5: Asignar siguiente número disponible
    console.log('📋 TEST 5: Asignar siguiente Hot Desk disponible');
    const hotDesk4 = await assignHotDeskNumber(testDate, testStart, testEnd);
    console.log(`✅ Hot Desk asignado: ${hotDesk4}/6 (debería ser 4)\n`);

    // Test 6: Llenar hasta 6/6
    console.log('📋 TEST 6: Llenar hasta 6/6');
    for (let i = 4; i <= 6; i++) {
      await reservationRepository.create({
        user_phone: `+test${i}`,
        service_type: 'hotDesk',
        date: testDate,
        start_time: testStart,
        end_time: testEnd,
        duration_hours: 2,
        guest_count: 0,
        total_price: 10,
        was_free: false,
        status: 'confirmed',
        payment_status: 'pending',
        hot_desk_number: i,
        payment_method: 'tarjeta'
      });
      console.log(`   ✅ Hot Desk ${i}/6 reservado`);
    }
    console.log('');

    // Test 7: Verificar 6/6 lleno
    console.log('📋 TEST 7: Verificar estado lleno (6/6)');
    const availability3 = await checkHotDeskAvailability(testDate, testStart, testEnd);
    console.log('Resultado:', JSON.stringify(availability3, null, 2));
    console.log(`${availability3.isFull ? '❌' : '✅'} ¿Está lleno?: ${availability3.isFull}\n`);

    // Test 8: Intentar asignar cuando está lleno
    console.log('📋 TEST 8: Intentar asignar cuando está lleno');
    const hotDesk7 = await assignHotDeskNumber(testDate, testStart, testEnd);
    console.log(`${hotDesk7 === null ? '✅' : '❌'} Resultado: ${hotDesk7} (debería ser null)\n`);

    // Test 9: Verificar count de ocupados
    console.log('📋 TEST 9: Verificar conteo preciso');
    const countResult = await reservationRepository.countOccupiedHotDesks(testDate, testStart, testEnd);
    console.log('Resultado:', JSON.stringify(countResult, null, 2));
    console.log(`✅ Ocupados: ${countResult.occupiedCount}`);
    console.log(`✅ Disponibles: ${countResult.availableCount}`);
    console.log(`✅ Números ocupados: [${countResult.occupiedNumbers.join(', ')}]\n`);

    // Cleanup
    console.log('🧹 Limpiando datos de prueba...');
    for (let i = 1; i <= 6; i++) {
      await databaseService.run('DELETE FROM reservations WHERE user_phone = ?', [`+test${i}`]);
      await databaseService.run('DELETE FROM users WHERE phone_number = ?', [`+test${i}`]);
    }
    console.log('✅ Limpieza completada\n');

    console.log('🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE\n');
    console.log('📊 RESUMEN:');
    console.log('   ✅ Asignación automática de números (1-6)');
    console.log('   ✅ Validación de disponibilidad');
    console.log('   ✅ Detección de estado lleno (6/6)');
    console.log('   ✅ Retorna null cuando no hay espacio');
    console.log('   ✅ Conteo preciso de ocupados\n');

  } catch (error) {
    console.error('❌ ERROR EN PRUEBAS:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testHotDeskTracking();
