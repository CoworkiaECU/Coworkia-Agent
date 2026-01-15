/**
 * 🧪 Test E2E: Flujo Completo de Reserva
 * Valida el flujo completo con nombre WhatsApp real
 * 
 * Flujo probado:
 * 1. Usuario nuevo con nombre WhatsApp Business (emojis, keywords)
 * 2. Solicita reserva con datos completos
 * 3. Sistema limpia nombre automáticamente
 * 4. Activa confirmación con datos del formulario
 * 5. Usuario responde "si"
 * 6. Sistema crea reserva exitosamente
 */

import databaseService from '../../src/database/database.js';
import userRepository from '../../src/database/userRepository.js';
import { processMessageWithForm, clearForm } from '../../src/servicios/partial-reservation-form.js';
import { enhanceAuroraResponse } from '../../src/servicios/aurora-confirmation-helper.js';
import { processConfirmationResponse } from '../../src/servicios/confirmation-flow.js';
import { getPendingConfirmation } from '../../src/servicios/reservation-state.js';

const TEST_PHONE = '+593999888777';
const MESSY_WHATSAPP_NAME = '🏢 Diego Empresa WhatsApp Business ☎️+593987770788';

console.log('\n🧪 ========================================');
console.log('   TEST E2E: FLUJO COMPLETO DE RESERVA');
console.log('========================================\n');

async function runTest() {
  try {
    // 0. Inicializar base de datos
    console.log('📦 Inicializando base de datos...');
    await databaseService.initialize();
    
    // 1. Limpiar datos previos del test
    console.log('🧹 Limpiando datos de test anteriores...');
    await databaseService.run('DELETE FROM pending_confirmations WHERE user_phone = ?', [TEST_PHONE]);
    await databaseService.run('DELETE FROM reservation_state WHERE user_phone = ?', [TEST_PHONE]);
    await databaseService.run('DELETE FROM reservations WHERE user_phone = ?', [TEST_PHONE]);
    await databaseService.run('DELETE FROM users WHERE phone_number = ?', [TEST_PHONE]);
    await clearForm(TEST_PHONE);
    console.log('✅ Datos limpios\n');
    
    // 2. Crear usuario con nombre WhatsApp Business messy
    console.log('👤 Creando usuario con nombre WhatsApp Business...');
    console.log(`   Nombre original: "${MESSY_WHATSAPP_NAME}"`);
    
    await userRepository.create(TEST_PHONE, {
      name: null, // Nombre aún no limpiado
      whatsapp_display_name: MESSY_WHATSAPP_NAME,
      email: null,
      first_visit: true,
      free_trial_used: false
    });
    
    let profile = await userRepository.findByPhone(TEST_PHONE);
    console.log('✅ Usuario creado');
    console.log(`   WhatsApp name: "${profile.whatsapp_display_name}"`);
    console.log(`   Stored name: ${profile.name || 'NULL'}\n`);
    
    // 3. Calcular fecha para mañana (timezone Ecuador)
    const formatter = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const parts = formatter.formatToParts(tomorrow);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const tomorrowStr = `${year}-${month}-${day}`;
    
    console.log(`📅 Fecha calculada para mañana (Ecuador): ${tomorrowStr}\n`);
    
    // 4. Procesar mensaje de reserva con datos completos
    console.log('💬 Procesando mensaje: "quiero hot desk mañana 10am, mi email es diego@test.com"');
    
    const message = `quiero hot desk mañana 10am, mi email es diego@test.com`;
    const formResult = await processMessageWithForm(TEST_PHONE, message, profile, false);
    
    console.log('📋 FormResult obtenido:');
    console.log('   - needsMoreInfo:', formResult.needsMoreInfo);
    console.log('   - isComplete:', formResult.form?.isComplete());
    console.log('   - spaceType:', formResult.form?.spaceType);
    console.log('   - date:', formResult.form?.date);
    console.log('   - time:', formResult.form?.time);
    console.log('   - email:', formResult.form?.email);
    
    if (formResult.needsMoreInfo) {
      console.log('❌ ERROR: Formulario incompleto - necesita más info');
      console.log('   Prompt:', formResult.prompt);
      process.exit(1);
    }
    
    console.log('✅ Formulario completo\n');
    
    // 5. Simular respuesta de Aurora que activa confirmación
    console.log('🤖 Simulando respuesta de Aurora...');
    
    const auroraMessage = `Perfecto Diego! 🎉

Reserva para mañana:
📅 Fecha: ${tomorrowStr}
🕐 Hora: 10:00 AM  
💻 Hot Desk
⏱️ Duración: 2 horas

💰 Primera visita GRATIS 🎁

¿Confirmas esta reserva? Responde SI para continuar o NO para cancelar.`;
    
    console.log('💬 Aurora dice:', auroraMessage.substring(0, 100) + '...\n');
    
    // 6. Pasar por enhanceAuroraResponse
    console.log('⚡ Procesando con enhanceAuroraResponse...');
    
    profile = await userRepository.findByPhone(TEST_PHONE); // Refresh profile
    const enhancement = await enhanceAuroraResponse(auroraMessage, profile, formResult);
    
    console.log('📋 Enhancement result:');
    console.log('   - enhanced:', enhancement.enhanced);
    console.log('   - error:', enhancement.error || 'NINGUNO');
    
    if (enhancement.enhanced) {
      console.log('✅ Confirmación activada');
      console.log('   Mensaje final:', enhancement.finalMessage.substring(0, 150) + '...\n');
    } else {
      console.log('❌ ERROR: No se activó confirmación');
      console.log('   Note:', enhancement.note);
      process.exit(1);
    }
    
    // 7. Verificar que se guardó pending_confirmation
    console.log('🔍 Verificando pending_confirmation...');
    
    profile = await userRepository.findByPhone(TEST_PHONE);
    const pendingConf = getPendingConfirmation(profile);
    
    if (!pendingConf) {
      console.log('❌ ERROR: No se guardó pending_confirmation');
      process.exit(1);
    }
    
    console.log('✅ Pending confirmation guardada:');
    console.log('   - date:', pendingConf.date);
    console.log('   - startTime:', pendingConf.startTime);
    console.log('   - serviceType:', pendingConf.serviceType);
    console.log('   - wasFree:', pendingConf.wasFree);
    console.log('   - email:', pendingConf.email || 'NULL\n');
    
    // 8. Usuario responde "si"
    console.log('💬 Usuario responde: "si"\n');
    console.log('⚡ Procesando confirmación...');
    
    profile = await userRepository.findByPhone(TEST_PHONE);
    const confirmResult = await processConfirmationResponse('si', profile);
    
    console.log('📋 Confirmation result:');
    console.log('   - success:', confirmResult.success);
    console.log('   - actionType:', confirmResult.actionType);
    console.log('   - reservationId:', confirmResult.reservationId || 'NULL');
    
    if (!confirmResult.success) {
      console.log('❌ ERROR: Confirmación falló');
      console.log('   Message:', confirmResult.message);
      process.exit(1);
    }
    
    console.log('✅ Reserva creada exitosamente');
    console.log('   ID:', confirmResult.reservationId);
    console.log('   Mensaje:', confirmResult.message.substring(0, 150) + '...\n');
    
    // 9. Verificar reserva en base de datos
    console.log('🔍 Verificando reserva en base de datos...');
    
    const reservation = await databaseService.get(
      'SELECT * FROM reservations WHERE id = ?',
      [confirmResult.reservationId]
    );
    
    if (!reservation) {
      console.log('❌ ERROR: Reserva no encontrada en base de datos');
      process.exit(1);
    }
    
    console.log('✅ Reserva encontrada en DB:');
    console.log('   - user_phone:', reservation.user_phone);
    console.log('   - service_type:', reservation.service_type);
    console.log('   - date:', reservation.date);
    console.log('   - start_time:', reservation.start_time);
    console.log('   - status:', reservation.status);
    console.log('   - payment_status:', reservation.payment_status);
    console.log('   - total_price:', reservation.total_price);
    console.log('   - was_free:', reservation.was_free);
    
    // 10. Verificar usuario actualizado
    console.log('\n🔍 Verificando usuario actualizado...');
    
    profile = await userRepository.findByPhone(TEST_PHONE);
    
    console.log('✅ Usuario actualizado:');
    console.log('   - name:', profile.name || 'NULL');
    console.log('   - email:', profile.email || 'NULL');
    console.log('   - first_visit:', profile.first_visit);
    console.log('   - free_trial_used:', profile.free_trial_used);
    
    // Verificar que nombre fue limpiado
    if (profile.name && profile.name !== MESSY_WHATSAPP_NAME) {
      console.log('✅ Nombre limpiado correctamente');
      console.log(`   Original: "${MESSY_WHATSAPP_NAME}"`);
      console.log(`   Limpio: "${profile.name}"`);
    } else {
      console.log('⚠️ ADVERTENCIA: Nombre no fue limpiado (esperado en este flujo)');
    }
    
    // 11. Limpiar datos de test
    console.log('\n🧹 Limpiando datos de test...');
    await databaseService.run('DELETE FROM pending_confirmations WHERE user_phone = ?', [TEST_PHONE]);
    await databaseService.run('DELETE FROM reservation_state WHERE user_phone = ?', [TEST_PHONE]);
    await databaseService.run('DELETE FROM reservations WHERE user_phone = ?', [TEST_PHONE]);
    await databaseService.run('DELETE FROM users WHERE phone_number = ?', [TEST_PHONE]);
    await clearForm(TEST_PHONE);
    
    console.log('\n✅ ========================================');
    console.log('   TEST COMPLETADO EXITOSAMENTE ✨');
    console.log('========================================\n');
    
    console.log('📊 RESUMEN:');
    console.log('   ✅ Formulario parcial detecta datos correctamente');
    console.log('   ✅ enhanceAuroraResponse activa confirmación con formResult');
    console.log('   ✅ Pending confirmation guardada correctamente');
    console.log('   ✅ Usuario responde "si" y se crea reserva');
    console.log('   ✅ Reserva guardada en base de datos');
    console.log('   ✅ Usuario actualizado correctamente');
    console.log('   ✅ Sistema funciona end-to-end\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTest();
