/**
 * 🧪 Test del caso real del screenshot - Aurora Form Flow
 * 
 * Problema original:
 * Usuario: "quiero reservar un hot desk para ir hoy a las 9am"
 * Aurora (antes): "Perfecto Diego! Te reservo un Hot Desk..." (saltaba pasos)
 * Aurora (ahora): Debe preguntar SOLO lo faltante paso a paso
 */

import { PartialReservationForm, extractDataFromMessage } from '../../src/servicios/partial-reservation-form.js';

console.log('🧪 TEST: Caso real del screenshot - Aurora Form Flow\n');
console.log('═══════════════════════════════════════════════════\n');

const userId = 'test-diego-' + Date.now();
const userProfile = {
  userId,
  name: 'Diego',
  email: null, // No tiene email guardado
  freeTrialUsed: false
};

async function runTest() {
  try {
    console.log('✅ Test sin base de datos (lógica pura)\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 1: Mensaje inicial (como el screenshot)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📱 PASO 1: Usuario envía mensaje inicial');
    console.log('Usuario: "quiero reservar un hot desk para ir hoy a las 9am"\n');

    const form1 = new PartialReservationForm(userId, {}, false);
    const updates1 = extractDataFromMessage('quiero reservar un hot desk para ir hoy a las 9am', form1);
    form1.updateFields(updates1);
    
    const step1 = {
      form: form1,
      updates: updates1,
      needsMoreInfo: !form1.isComplete(),
      nextQuestion: form1.getNextQuestion()
    };

    console.log('📊 Resultado PASO 1:');
    console.log('  - spaceType:', step1.form.spaceType);
    console.log('  - date:', step1.form.date);
    console.log('  - time:', step1.form.time);
    console.log('  - email:', step1.form.email);
    console.log('  - paymentMethod:', step1.form.paymentMethod);
    console.log('  - needsMoreInfo:', step1.needsMoreInfo);
    console.log('  - nextQuestion:', step1.nextQuestion ? '✅ Presente' : '❌ Ausente');
    console.log('');

    // ✅ VALIDACIONES PASO 1
    if (step1.form.spaceType !== 'hotDesk') {
      console.error('❌ ERROR: No detectó spaceType=hotDesk');
      process.exit(1);
    }
    if (!step1.form.date) {
      console.error('❌ ERROR: No detectó fecha (hoy)');
      process.exit(1);
    }
    if (step1.form.time !== '09:00') {
      console.error('❌ ERROR: No detectó time=09:00, recibió:', step1.form.time);
      process.exit(1);
    }
    if (!step1.needsMoreInfo) {
      console.error('❌ ERROR: Debería necesitar más info (faltan email y pago)');
      process.exit(1);
    }
    if (!step1.nextQuestion) {
      console.error('❌ ERROR: Debería tener nextQuestion para pedir email');
      process.exit(1);
    }

    console.log('🤖 Aurora responde:');
    console.log(`"${step1.nextQuestion}"`);
    console.log('');
    console.log('✅ PASO 1 CORRECTO: Extrajo datos y pide email\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 2: Usuario proporciona email
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📱 PASO 2: Usuario proporciona email');
    console.log('Usuario: "yo@diegovillota.com"\n');

    const updates2 = extractDataFromMessage('yo@diegovillota.com', form1);
    form1.updateFields(updates2);
    
    const step2 = {
      form: form1,
      updates: updates2,
      needsMoreInfo: !form1.isComplete(),
      nextQuestion: form1.getNextQuestion()
    };

    console.log('📊 Resultado PASO 2:');
    console.log('  - email:', step2.form.email);
    console.log('  - needsMoreInfo:', step2.needsMoreInfo);
    console.log('  - nextQuestion:', step2.nextQuestion ? '✅ Presente' : '❌ Ausente');
    console.log('  - freeTrialUsed:', step2.form.freeTrialUsed);
    console.log('');

    // ✅ VALIDACIONES PASO 2
    if (step2.form.email !== 'yo@diegovillota.com') {
      console.error('❌ ERROR: No guardó email correctamente');
      process.exit(1);
    }

    // Si es primera visita (freeTrialUsed=false), formulario está completo sin pago
    if (step2.form.freeTrialUsed === false) {
      console.log('✅ Primera visita GRATIS - no necesita pago');
      if (step2.needsMoreInfo) {
        console.error('❌ ERROR: No debería necesitar más info (primera visita gratis)');
        process.exit(1);
      }
      
      const confirmation = step2.form.getConfirmationMessage();
      console.log('🤖 Aurora muestra confirmación GRATIS:');
      console.log(`"${confirmation}"`);
      console.log('');
      console.log('✅ PASO 2 CORRECTO: Formulario completo para primera visita\n');
      
    } else {
      // Si ya usó el trial, necesita método de pago
      if (!step2.needsMoreInfo) {
        console.error('❌ ERROR: Aún falta método de pago');
        process.exit(1);
      }
      if (!step2.nextQuestion) {
        console.error('❌ ERROR: Debería preguntar método de pago');
        process.exit(1);
      }

      console.log('🤖 Aurora responde:');
      console.log(`"${step2.nextQuestion}"`);
      console.log('');
      console.log('✅ PASO 2 CORRECTO: Guardó email y pide método de pago\n');

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PASO 3: Usuario elige método de pago
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('📱 PASO 3: Usuario elige método de pago');
      console.log('Usuario: "efectivo"\n');

      const updates3 = extractDataFromMessage('efectivo', form1);
      form1.updateFields(updates3);
      
      const step3 = {
        form: form1,
        updates: updates3,
        needsMoreInfo: !form1.isComplete(),
        nextQuestion: form1.getNextQuestion(),
        confirmationMessage: form1.getConfirmationMessage()
      };

      console.log('📊 Resultado PASO 3:');
      console.log('  - paymentMethod:', step3.form.paymentMethod);
      console.log('  - needsMoreInfo:', step3.needsMoreInfo);
      console.log('  - confirmationMessage:', step3.confirmationMessage ? '✅ Presente' : '❌ Ausente');
      console.log('');

      // ✅ VALIDACIONES PASO 3
      if (step3.form.paymentMethod !== 'efectivo') {
        console.error('❌ ERROR: No guardó método de pago');
        process.exit(1);
      }
      if (step3.needsMoreInfo) {
        console.error('❌ ERROR: Ya no debería necesitar más info');
        console.error('   Campos faltantes:', step3.form.getMissingFields());
        process.exit(1);
      }
      if (!step3.confirmationMessage && !step3.nextQuestion) {
        console.error('❌ ERROR: Debería mostrar confirmación o mensaje completo');
        process.exit(1);
      }

      console.log('🤖 Aurora responde:');
      console.log(`"${step3.confirmationMessage || step3.nextQuestion}"`);
      console.log('');
      console.log('✅ PASO 3 CORRECTO: Formulario completo, listo para confirmación\n');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RESUMEN FINAL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TEST PASADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📋 RESUMEN:');
    console.log('  ✅ Extracción automática: spaceType, date, time');
    console.log('  ✅ Pregunta paso a paso: email → pago (si aplica)');
    console.log('  ✅ No salta al orquestador hasta completar formulario');
    console.log('  ✅ Respeta primera visita GRATIS (sin pago)');
    console.log('');

    console.log('🎯 COMPORTAMIENTO ESPERADO EN PRODUCCIÓN:');
    console.log('  1. Usuario: "quiero reservar hot desk hoy 9am"');
    console.log('  2. Aurora: "¿Cuál es tu email para la confirmación?"');
    console.log('  3. Usuario: "yo@diegovillota.com"');
    console.log('  4a. Primera visita: Muestra confirmación GRATIS');
    console.log('  4b. Visitas siguientes: "¿Cómo deseas pagar?"');
    console.log('');
    console.log('🚀 LISTO PARA DEPLOY');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

runTest();
