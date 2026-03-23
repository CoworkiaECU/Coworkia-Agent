// scripts/test-response-tracking.mjs
// Test para verificar que el tracking de respuestas de clientes funciona correctamente

import dotenv from 'dotenv';
dotenv.config();

import databaseService from '../src/database/database.js';
import * as alunaRepo from '../src/database/alunaRepository.js';

const TEST_PHONE = '593987654321';
const TEST_NAME = 'Test User Response Tracking';

async function testResponseTracking() {
  console.log('🧪 TEST: Tracking de respuestas de clientes Aluna\n');

  try {
    await databaseService.initialize();
    await databaseService.ensureInitialized();

    // 1. Limpiar datos de test previos
    console.log('🧹 Limpiando datos de test previos...');
    await databaseService.run(
      `DELETE FROM aluna_prospect_followups WHERE user_phone = $1`,
      [TEST_PHONE]
    );

    // 2. Crear prospecto de prueba
    console.log(`📝 Creando prospecto de prueba: ${TEST_PHONE}`);
    await alunaRepo.trackAlunaProspect(
      TEST_PHONE,
      TEST_NAME,
      'oficina-individual',
      'OIND30',
      'test@example.com'
    );

    // 3. Simular que se envió follow-up D+1
    console.log('📤 Simulando envío de follow-up D+1...');
    await databaseService.run(
      `UPDATE aluna_prospect_followups 
       SET followup_24h_sent_at = CURRENT_TIMESTAMP - INTERVAL '2 hours'
       WHERE user_phone = $1`,
      [TEST_PHONE]
    );

    // 4. Verificar estado ANTES de respuesta
    const before = await databaseService.get(
      `SELECT * FROM aluna_prospect_followups WHERE user_phone = $1`,
      [TEST_PHONE]
    );

    console.log('\n📊 ESTADO ANTES de respuesta:');
    console.log(`   Follow-up D+1 enviado: ${before.followup_24h_sent_at ? '✅ Sí' : '❌ No'}`);
    console.log(`   Cliente respondió: ${before.client_response_at ? '✅ Sí' : '❌ No'}`);
    console.log(`   Canal WhatsApp: ${before.client_whatsapp_reply ? '✅ Sí' : '❌ No'}`);

    // 5. Simular que el cliente responde
    console.log('\n💬 Simulando respuesta del cliente...');
    await alunaRepo.markAlunaClientResponse(TEST_PHONE, 'whatsapp');

    // 6. Verificar estado DESPUÉS de respuesta
    const after = await databaseService.get(
      `SELECT * FROM aluna_prospect_followups WHERE user_phone = $1`,
      [TEST_PHONE]
    );

    console.log('\n📊 ESTADO DESPUÉS de respuesta:');
    console.log(`   Follow-up D+1 enviado: ${after.followup_24h_sent_at ? '✅ Sí' : '❌ No'}`);
    console.log(`   Cliente respondió: ${after.client_response_at ? '✅ Sí' : '❌ No'}`);
    console.log(`   Canal WhatsApp: ${after.client_whatsapp_reply ? '✅ Sí' : '❌ No'}`);

    // 7. Validar resultados
    console.log('\n🔍 VALIDACIÓN:\n');

    const checks = [
      {
        name: 'Columna client_response_at existe',
        pass: after.hasOwnProperty('client_response_at'),
      },
      {
        name: 'Columna client_whatsapp_reply existe',
        pass: after.hasOwnProperty('client_whatsapp_reply'),
      },
      {
        name: 'client_response_at registrado',
        pass: after.client_response_at !== null,
      },
      {
        name: 'client_whatsapp_reply = true',
        pass: after.client_whatsapp_reply === true,
      },
      {
        name: 'followup_24h_sent_at intacto',
        pass: after.followup_24h_sent_at !== null,
      },
    ];

    let allPassed = true;
    checks.forEach((check) => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`   ${icon} ${check.name}`);
      if (!check.pass) allPassed = false;
    });

    // 8. Limpiar
    console.log('\n🧹 Limpiando datos de test...');
    await databaseService.run(
      `DELETE FROM aluna_prospect_followups WHERE user_phone = $1`,
      [TEST_PHONE]
    );

    console.log(
      allPassed
        ? '\n✅ TEST EXITOSO - Tracking de respuestas funcionando correctamente'
        : '\n❌ TEST FALLIDO - Revisar implementación'
    );

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ ERROR en test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testResponseTracking();
