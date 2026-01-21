/**
 * 🧪 Test del caso real del screenshot
 * Usuario: "quiero reservar un hot desk para ir hoy a las 9am"
 */

import { PartialReservationForm, extractDataFromMessage } from '../../src/servicios/partial-reservation-form.js';

console.log('🧪 TEST: Caso real del screenshot\n');
console.log('═══════════════════════════════════════════════════\n');

async function runTest() {
  try {
    // PASO 1: Mensaje inicial
    console.log('📱 PASO 1: "quiero reservar un hot desk para ir hoy a las 9am"\n');
    
    const form = new PartialReservationForm('test-user', {}, false);
    const updates1 = extractDataFromMessage('quiero reservar un hot desk para ir hoy a las 9am', form);
    form.updateFields(updates1);
    
    console.log('✅ Datos extraídos:');
    console.log('  - spaceType:', form.spaceType);
    console.log('  - date:', form.date);
    console.log('  - time:', form.time);
    console.log('  - email:', form.email);
    console.log('  - Completo?:', form.isComplete());
    console.log('');
    
    if (form.spaceType !== 'hotDesk') throw new Error('No detectó hotDesk');
    if (!form.date) throw new Error('No detectó fecha');
    if (form.time !== '09:00') throw new Error(`Hora incorrecta: ${form.time}`);
    if (form.isComplete()) throw new Error('No debería estar completo (falta email y pago)');
    
    const nextQ1 = form.getNextQuestion();
    console.log('🤖 Aurora pregunta:', nextQ1);
    console.log('');
    
    // PASO 2: Email
    console.log('📱 PASO 2: Usuario da email\n');
    const updates2 = extractDataFromMessage('yo@diegovillota.com', form);
    form.updateFields(updates2);
    
    console.log('✅ Email guardado:', form.email);
    console.log('  - Completo?:', form.isComplete());
    console.log('  - Primera visita gratis?:', form.freeTrialUsed === false);
    console.log('');
    
    if (form.email !== 'yo@diegovillota.com') throw new Error('Email no guardado');
    
    // Si es primera visita gratis, está completo (no pide pago)
    // Si ya usó el trial, necesita método de pago
    if (form.freeTrialUsed === false) {
      console.log('✅ Primera visita GRATIS - no necesita pago');
      if (!form.isComplete()) throw new Error('Debería estar completo (visita gratis)');
      
      console.log('\n🤖 Aurora muestra confirmación GRATIS:');
      const confirmation = form.getConfirmationMessage();
      console.log(confirmation);
      
    } else {
      if (form.isComplete()) throw new Error('No debería estar completo (falta pago)');
      
      const nextQ2 = form.getNextQuestion();
      console.log('🤖 Aurora pregunta:', nextQ2);
      console.log('');
      
      // PASO 3: Pago
      console.log('📱 PASO 3: Usuario elige método\n');
      const updates3 = extractDataFromMessage('efectivo', form);
      form.updateFields(updates3);
      
      console.log('✅ Pago guardado:', form.paymentMethod);
      console.log('  - Completo?:', form.isComplete());
      console.log('');
      
      if (form.paymentMethod !== 'efectivo') throw new Error('Pago no guardado');
      if (!form.isComplete()) throw new Error('Debería estar completo');
      
      const confirmation = form.getConfirmationMessage();
      console.log('🤖 Aurora muestra confirmación:');
      console.log(confirmation);
    }
    
    console.log('');
    
    // RESUMEN
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TEST PASADO');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('📋 Comportamiento verificado:');
    console.log('  ✅ Extrae automáticamente: hotDesk, fecha, hora');
    console.log('  ✅ Pregunta paso a paso: email → pago');
    console.log('  ✅ Muestra confirmación solo cuando completo');
    console.log('');
    console.log('🚀 LISTO PARA DEPLOY');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTest();
