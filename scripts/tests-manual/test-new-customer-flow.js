/**
 * 🧪 TEST: Flujo completo de cliente nuevo con free trial
 * Simula el contexto que Aurora recibe y verifica el bug
 */

import userRepository from '../src/database/userRepository.js';
import { procesarMensaje } from '../src/deteccion-intenciones/orquestador.js';
import { setPendingConfirmation, getPendingConfirmation } from '../src/servicios/reservation-state.js';
import databaseService from '../src/database/database.js';

const TEST_USER = {
  userId: '+593999999999',
  name: 'Test Usuario',
  email: 'test@example.com'
};

async function testNewCustomerFlow() {
  console.log('\n🧪 ===== TEST: Flujo Cliente Nuevo =====\n');

  // 0️⃣ Inicializar base de datos
  await databaseService.initialize();
  console.log('✅ Base de datos inicializada\n');

  // 1️⃣ Crear usuario nuevo en la BD
  console.log('1️⃣ PASO 1: Crear usuario nuevo');
  await userRepository.createOrUpdate(TEST_USER.userId, {
    name: TEST_USER.name,
    whatsapp_display_name: TEST_USER.name,
    first_visit: 1,  // TRUE
    free_trial_used: 0,  // FALSE
    conversation_count: 1,
    last_message_at: new Date().toISOString()
  });

  let user = await userRepository.findByPhone(TEST_USER.userId);
  console.log('   ✅ Usuario creado:', {
    name: user.name,
    first_visit: user.first_visit,
    free_trial_used: user.free_trial_used
  });

  // 2️⃣ Verificar contexto SIN pending confirmation
  console.log('\n2️⃣ PASO 2: Verificar contexto SIN reserva pendiente');
  let perfil = {
    userId: TEST_USER.userId,
    name: TEST_USER.name,
    firstVisit: true,
    freeTrialUsed: false,
    conversationCount: 1,
    reservationHistory: [],
    upcomingReservations: [],
    pendingConfirmation: null
  };
  
  const resultado1 = procesarMensaje('¡Hola! quiero probar el servicio', perfil, []);
  const prompt1 = resultado1.prompt;
  
  console.log('\n📋 PROMPT COMPLETO ENVIADO A AURORA:');
  console.log('─────────────────────────────────────');
  console.log(prompt1);
  console.log('─────────────────────────────────────\n');

  // Verificar que dice "Día gratis disponible: SÍ"
  if (prompt1.includes('Día gratis disponible: SÍ')) {
    console.log('   ✅ CORRECTO: Prompt incluye "Día gratis disponible: SÍ"');
  } else {
    console.log('   ❌ ERROR: NO incluye "Día gratis disponible: SÍ"');
  }

  if (prompt1.includes('NO pedir pago, NO mencionar precio')) {
    console.log('   ✅ CORRECTO: Prompt incluye instrucción de NO pedir pago');
  } else {
    console.log('   ❌ ERROR: NO incluye instrucción de NO pedir pago');
  }

  // 3️⃣ Simular que el formulario guarda pendingConfirmation
  console.log('\n3️⃣ PASO 3: Guardar pending confirmation (formulario parcial)');
  
  const reservationData = {
    formData: {
      userId: TEST_USER.userId,
      spaceType: 'hotDesk',
      date: '2025-12-29',
      time: '08:00',
      email: TEST_USER.email,
      numPeople: 1,
      durationHours: 2,
      paymentMethod: 'tarjeta'
      // 🚨 NOTE: NO tiene campo wasFree aquí
    },
    type: 'partial_form'
  };

  await setPendingConfirmation(TEST_USER.userId, reservationData, 120);
  console.log('   ✅ Pending confirmation guardada (SIN campo wasFree)');

  // 4️⃣ Verificar contexto CON pending confirmation
  console.log('\n4️⃣ PASO 4: Verificar contexto CON reserva pendiente');
  
  const pendingData = await getPendingConfirmation(TEST_USER.userId);
  perfil.pendingConfirmation = pendingData;
  perfil.freeTrialUsed = false; // 🚨 IMPORTANTE: sigue siendo false
  
  const resultado2 = procesarMensaje('tarjeta', perfil, []);
  const prompt2 = resultado2.prompt;

  console.log('\n📋 PROMPT CON RESERVA PENDIENTE:');
  console.log('─────────────────────────────────────');
  console.log(prompt2);
  console.log('─────────────────────────────────────\n');

  // 🚨 VERIFICACIÓN CRÍTICA
  if (prompt2.includes('Día gratis disponible: SÍ')) {
    console.log('   ✅ CORRECTO: Aún dice "Día gratis disponible: SÍ"');
  } else {
    console.log('   ❌ ERROR: Ya no dice "Día gratis disponible: SÍ"');
  }

  if (prompt2.includes('Gratis: SÍ 🎉 - Free trial disponible')) {
    console.log('   ✅ CORRECTO: Pending confirmation dice "Gratis: SÍ 🎉"');
  } else if (prompt2.includes('Gratis: NO - Pago requerido')) {
    console.log('   ❌ ERROR CRÍTICO: Pending confirmation dice "Gratis: NO - Pago requerido"');
    console.log('   🔍 Este es el bug que causa que Aurora pida pago');
  } else {
    console.log('   ⚠️ WARNING: No se encuentra la línea "Gratis:" en el prompt');
  }

  // 5️⃣ Resumen
  console.log('\n📊 ===== RESUMEN DEL TEST =====\n');
  console.log(`Usuario: ${perfil.name}`);
  console.log(`Free trial usado: ${perfil.freeTrialUsed}`);
  console.log(`Tiene pending confirmation: ${perfil.pendingConfirmation ? 'SÍ' : 'NO'}`);
  
  if (perfil.pendingConfirmation && perfil.pendingConfirmation.formData) {
    console.log(`Pending confirmation tiene wasFree: ${perfil.pendingConfirmation.formData.wasFree !== undefined ? 'SÍ' : 'NO'}`);
  }

  // 6️⃣ Verificación final
  console.log('\n🔍 ===== VERIFICACIÓN FINAL =====\n');
  
  const test1Passed = prompt1.includes('Día gratis disponible: SÍ');
  const test2Passed = prompt2.includes('Día gratis disponible: SÍ');
  const test3Passed = prompt2.includes('Gratis: SÍ 🎉 - Free trial disponible');
  const test4Failed = prompt2.includes('Gratis: NO - Pago requerido');
  
  console.log(`✅ Contexto inicial tiene "Día gratis disponible: SÍ": ${test1Passed ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Contexto con pending tiene "Día gratis disponible: SÍ": ${test2Passed ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Pending confirmation dice "Gratis: SÍ 🎉": ${test3Passed ? 'PASS' : 'FAIL'}`);
  console.log(`❌ Pending confirmation dice "Gratis: NO - Pago requerido": ${test4Failed ? 'FAIL (bug presente)' : 'PASS (bug arreglado)'}`);
  
  if (test1Passed && test2Passed && test3Passed && !test4Failed) {
    console.log('\n✅✅✅ TODOS LOS TESTS PASARON - BUG ARREGLADO\n');
  } else {
    console.log('\n❌❌❌ ALGUNOS TESTS FALLARON - BUG AÚN PRESENTE\n');
  }
}

// Ejecutar test
testNewCustomerFlow()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error en test:', error);
    process.exit(1);
  });
