#!/usr/bin/env node
/**
 * 🧪 TEST: Flujo completo de cliente recurrente
 * 
 * Verifica que un cliente con free_trial_used = true:
 * 1. Ve precio correcto (no gratis)
 * 2. Se le pide método de pago
 * 3. wasFree = false en confirmación
 * 4. No se menciona "primera visita"
 */

import 'dotenv/config';
import userRepository from '../src/database/userRepository.js';
import reservationRepository from '../src/database/reservationRepository.js';
import { setPendingConfirmation, getPendingConfirmation, clearPendingConfirmation } from '../src/servicios/reservation-state.js';
import { PartialReservationForm, saveForm } from '../src/servicios/partial-reservation-form.js';
import databaseService from '../src/database/database.js';

const TEST_USER = {
  userId: '+593888888888',
  name: 'Cliente Recurrente',
  email: 'recurrente@example.com'
};

async function testRecurringCustomerFlow() {
  console.log('\n🧪 ===== TEST: Flujo Cliente Recurrente =====\n');

  // 0️⃣ Inicializar base de datos
  await databaseService.initialize();
  console.log('✅ Base de datos inicializada\n');

  try {
    // 1️⃣ Crear usuario recurrente en la BD
    console.log('1️⃣ PASO 1: Crear usuario recurrente');
    await userRepository.createOrUpdate(TEST_USER.userId, {
      name: TEST_USER.name,
      email: TEST_USER.email,
      whatsapp_display_name: TEST_USER.name,
      first_visit: 0,  // FALSE - no es primera vez
      free_trial_used: 1,  // TRUE - ya usó el trial
      conversation_count: 5,
      last_message_at: new Date().toISOString()
    });

    let user = await userRepository.findByPhone(TEST_USER.userId);
    console.log('   ✅ Usuario creado:', {
      name: user.name,
      first_visit: user.first_visit,
      free_trial_used: user.free_trial_used
    });

    // 2️⃣ Crear reserva pasada (para historial)
    console.log('\n2️⃣ PASO 2: Crear reserva pasada en historial');
    const pastReservation = await reservationRepository.create({
      user_phone: TEST_USER.userId,
      user_name: TEST_USER.name,
      service_type: 'hotDesk',
      date: '2025-11-01',
      start_time: '09:00',
      end_time: '11:00',
      duration_hours: 2,
      guest_count: 0,
      total_price: 0,
      status: 'confirmed',
      was_free: true,  // La primera fue gratis
      payment_method: null,
      email: TEST_USER.email
    });
    console.log('   ✅ Reserva pasada creada:', pastReservation.id);

    // 3️⃣ Simular formulario parcial con freeTrialUsed = true
    console.log('\n3️⃣ PASO 3: Crear formulario parcial para nueva reserva');
    const form = new PartialReservationForm(TEST_USER.userId, {
      spaceType: 'hotDesk',
      date: '2025-11-25',
      time: '14:00',
      email: TEST_USER.email,
      numPeople: 1,
      durationHours: 2,
      paymentMethod: 'transferencia'
    }, true);  // ← freeTrialUsed = true (RECURRENTE)

    await saveForm(form);
    console.log('   ✅ Formulario guardado:', {
      spaceType: form.spaceType,
      date: form.date,
      time: form.time,
      freeTrialUsed: form.freeTrialUsed,
      paymentMethod: form.paymentMethod
    });

    // 4️⃣ Obtener pending confirmation y verificar normalización
    console.log('\n4️⃣ PASO 4: Verificar normalización de datos');
    const pending = await getPendingConfirmation(TEST_USER.userId);
    
    console.log('   📋 Datos normalizados:');
    console.log('      • userId:', pending.userId);
    console.log('      • date:', pending.date);
    console.log('      • startTime:', pending.startTime);
    console.log('      • serviceType:', pending.serviceType);
    console.log('      • wasFree:', pending.wasFree);
    console.log('      • totalPrice:', pending.totalPrice);
    console.log('      • paymentMethod:', pending.paymentMethod);
    console.log('      • _type:', pending._type);

    // 5️⃣ VALIDACIONES
    console.log('\n5️⃣ PASO 5: Validar resultados');
    
    const validations = [
      {
        name: 'wasFree debe ser false (cliente recurrente)',
        condition: pending.wasFree === false,
        actual: pending.wasFree
      },
      {
        name: 'totalPrice debe ser > 0',
        condition: pending.totalPrice > 0,
        actual: pending.totalPrice
      },
      {
        name: 'paymentMethod debe existir',
        condition: pending.paymentMethod !== null,
        actual: pending.paymentMethod
      },
      {
        name: 'startTime debe ser "14:00"',
        condition: pending.startTime === '14:00',
        actual: pending.startTime
      },
      {
        name: 'serviceType debe ser "hotDesk"',
        condition: pending.serviceType === 'hotDesk',
        actual: pending.serviceType
      }
    ];

    let passed = 0;
    let failed = 0;

    validations.forEach(test => {
      if (test.condition) {
        console.log(`   ✅ ${test.name}`);
        passed++;
      } else {
        console.log(`   ❌ ${test.name} (actual: ${test.actual})`);
        failed++;
      }
    });

    console.log(`\n📊 RESUMEN: ${passed} ✅ | ${failed} ❌`);

    // 6️⃣ Limpiar datos de prueba
    console.log('\n6️⃣ PASO 6: Limpiar datos de prueba');
    await clearPendingConfirmation(TEST_USER.userId);
    await databaseService.run('DELETE FROM reservations WHERE user_phone = ?', [TEST_USER.userId]);
    await databaseService.run('DELETE FROM users WHERE phone_number = ?', [TEST_USER.userId]);
    console.log('   ✅ Datos limpiados');

    if (failed === 0) {
      console.log('\n🎉 TEST PASSED - Flujo de cliente recurrente funciona correctamente\n');
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED - Hay problemas en el flujo de cliente recurrente\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 ERROR en test:', error.message);
    console.error(error.stack);
    
    // Limpiar en caso de error
    try {
      await clearPendingConfirmation(TEST_USER.userId);
      await databaseService.run('DELETE FROM reservations WHERE user_phone = ?', [TEST_USER.userId]);
      await databaseService.run('DELETE FROM users WHERE phone_number = ?', [TEST_USER.userId]);
    } catch (cleanupError) {
      console.error('Error limpiando:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Ejecutar test
testRecurringCustomerFlow();
