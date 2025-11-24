/**
 * 🧪 TEST: Verificar fix de cancelación de reservas conflictivas
 * Reproduce el bug: usuario dice SI y obtiene "Hot Desk ocupado"
 */

import databaseService from '../src/database/database.js';
import reservationRepository from '../src/database/reservationRepository.js';
import { processConfirmationResponse } from '../src/servicios/confirmation-flow.js';
import { setPendingConfirmation } from '../src/servicios/reservation-state.js';

const TEST_USER = '+593987654321';
const TEST_DATE = '2026-01-28';
const TEST_TIME = '15:33';

async function testConfirmationFix() {
  console.log('\n🧪 ===== TEST: Fix Confirmación con Reservas Conflictivas =====\n');

  try {
    // Inicializar BD
    await databaseService.initialize();
    console.log('✅ Base de datos inicializada\n');

    // PASO 0: Limpiar reservas viejas primero
    console.log('0️⃣ PASO 0: Limpiando reservas viejas del usuario de test');
    const oldReservations = await reservationRepository.findByUser(TEST_USER);
    console.log(`   Encontradas ${oldReservations.length} reservas viejas`);
    for (const res of oldReservations) {
      await reservationRepository.updateStatus(res.id, 'cancelled');
    }
    console.log('   ✅ Reservas viejas canceladas\n');

    // PASO 0.5: Crear usuario si no existe
    console.log('0️⃣.5 PASO 0.5: Crear usuario de prueba');
    const userRepository = (await import('../src/database/userRepository.js')).default;
    await userRepository.createOrUpdate(TEST_USER, {
      name: 'Test User',
      whatsapp_display_name: 'Test User',
      first_visit: false,
      free_trial_used: false,
      conversation_count: 1,
      last_message_at: new Date().toISOString()
    });
    console.log('   ✅ Usuario creado\n');

    // PASO 1: Crear reserva conflictiva (simulando reserva anterior)
    console.log('1️⃣ PASO 1: Crear reserva conflictiva previa');
    const conflictingReservation = await reservationRepository.create({
      user_phone: TEST_USER,
      service_type: 'hotDesk',
      date: TEST_DATE,
      start_time: TEST_TIME,
      end_time: '17:33',
      duration_hours: 2,
      guest_count: 0,
      total_price: 0,
      was_free: true,
      status: 'confirmed', // ← ESTE ES EL BUG: reserva confirmada no se cancelaba
      payment_status: 'waived'
    });
    
    console.log('   ✅ Reserva conflictiva creada:', {
      id: conflictingReservation.id,
      status: conflictingReservation.status,
      date: conflictingReservation.date,
      time: conflictingReservation.start_time
    });

    // PASO 2: Simular pending confirmation
    console.log('\n2️⃣ PASO 2: Crear pending confirmation para NUEVA reserva');
    const pendingData = {
      userId: TEST_USER,
      userName: 'Test User',
      date: TEST_DATE,
      startTime: TEST_TIME,
      endTime: '17:33',
      durationHours: 2,
      serviceType: 'hotDesk',
      wasFree: true,
      email: 'test@example.com',
      totalPrice: 0,
      guestCount: 0
    };

    await setPendingConfirmation(TEST_USER, pendingData);
    console.log('   ✅ Pending confirmation creada');

    // PASO 3: Procesar confirmación SI
    console.log('\n3️⃣ PASO 3: Procesar confirmación SI (aquí ocurría el bug)');
    const result = await processConfirmationResponse('SI', {
      userId: TEST_USER,
      name: 'Test User',
      email: 'test@example.com',
      freeTrialUsed: false,
      pendingConfirmation: pendingData // ← AGREGAR esto
    });

    console.log('\n📊 RESULTADO:', {
      success: result.success,
      hasError: !!result.message?.includes('ocupado'),
      message: result.message?.substring(0, 100) + '...'
    });

    if (result.success && !result.message?.includes('ocupado')) {
      console.log('\n✅ ✅ ✅ TEST PASSED - Fix funciona correctamente');
      console.log('   La reserva conflictiva fue cancelada y la nueva se creó sin errores');
    } else {
      console.log('\n❌ ❌ ❌ TEST FAILED - El bug persiste');
      console.log('   Mensaje completo:', result.message);
    }

    // PASO 4: Verificar estado de reservas
    console.log('\n4️⃣ PASO 4: Verificar estado final de reservas');
    const allReservations = await reservationRepository.findByUser(TEST_USER);
    console.log('   Total reservas del usuario:', allReservations.length);
    
    allReservations.forEach((res, idx) => {
      console.log(`   ${idx + 1}. ID: ${res.id.substring(0, 8)}... | Status: ${res.status} | Date: ${res.date} ${res.start_time}`);
    });

    const activeReservations = allReservations.filter(r => r.status !== 'cancelled');
    console.log(`\n   ✅ Reservas activas: ${activeReservations.length} (debería ser 1)`);
    console.log(`   🗑️  Reservas canceladas: ${allReservations.length - activeReservations.length}`);

    // Cleanup
    console.log('\n5️⃣ PASO 5: Limpieza');
    for (const res of allReservations) {
      await reservationRepository.updateStatus(res.id, 'cancelled');
    }
    console.log('   ✅ Todas las reservas de test canceladas');

  } catch (error) {
    console.error('\n❌ ERROR en test:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

// Ejecutar test
testConfirmationFix();
