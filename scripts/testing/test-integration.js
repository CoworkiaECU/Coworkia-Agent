#!/usr/bin/env node

/**
 * 🧪 Script de Testing de Integración Multi-Agente
 * 
 * Valida que todos los sistemas estén funcionando correctamente:
 * - Base de datos PostgreSQL
 * - Conversaciones unificadas
 * - Aurora Coordinator
 * - Google Calendar
 * - Agentes individuales
 */

import dotenv from 'dotenv';
dotenv.config();

import postgresAdapter from '../src/database/postgres-adapter.js';
import { conversationAdapter } from '../src/database/conversationAdapter.js';
import { 
  detectTopicFromMessage, 
  getAgentForTopic, 
  shouldHandover,
  TOPICS 
} from '../src/servicios/aurora-coordinator.js';
import { testCalendarIntegration } from '../src/servicios/calendar-integrator.js';

const TEST_USER_ID = '+593999TEST123';
const TEST_USER_NAME = 'Test Usuario';

let testsPassed = 0;
let testsFailed = 0;

/**
 * Helper para ejecutar tests
 */
async function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 ${testName}...`);
    await testFn();
    console.log(`✅ ${testName} - PASSED`);
    testsPassed++;
    return true;
  } catch (error) {
    console.error(`❌ ${testName} - FAILED`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

/**
 * Test 1: Conexión a PostgreSQL
 */
async function testDatabaseConnection() {
  const result = await postgresAdapter.query('SELECT NOW() as current_time');
  if (!result.rows || result.rows.length === 0) {
    throw new Error('No se pudo conectar a PostgreSQL');
  }
  console.log(`   ⏰ Hora servidor: ${result.rows[0].current_time}`);
}

/**
 * Test 2: Tablas de conversaciones existen
 */
async function testConversationTables() {
  const tables = ['agent_conversations', 'conversation_files', 'active_topics'];
  
  for (const table of tables) {
    const result = await postgresAdapter.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `, [table]);
    
    if (!result.rows[0].exists) {
      throw new Error(`Tabla ${table} no existe - ejecutar migración`);
    }
    console.log(`   ✓ Tabla ${table} existe`);
  }
}

/**
 * Test 3: Guardar y recuperar conversación
 */
async function testSaveAndLoadConversation() {
  // Guardar mensaje
  await conversationAdapter.saveConversationMessage(
    TEST_USER_ID,
    'user',
    'Hola, quiero una reserva',
    TOPICS.RESERVA,
    { testMode: true }
  );
  
  // Recuperar historial
  const history = await conversationAdapter.loadConversationHistory(
    TEST_USER_ID,
    null,
    10
  );
  
  if (history.length === 0) {
    throw new Error('No se guardó el mensaje correctamente');
  }
  
  console.log(`   ✓ Mensaje guardado y recuperado (${history.length} mensajes)`);
}

/**
 * Test 4: Detección de tópicos
 */
async function testTopicDetection() {
  const tests = [
    { msg: 'Quiero reservar un hot desk', expected: TOPICS.RESERVA },
    { msg: 'Tuve un choque en mi auto', expected: TOPICS.COLISION },
    { msg: 'Necesito seguro vehicular', expected: TOPICS.SEGURO },
    { msg: 'Quiero campañas de marketing', expected: TOPICS.MARKETING },
    { msg: 'Necesito cita médica', expected: TOPICS.SALUD }
  ];
  
  for (const test of tests) {
    const detected = detectTopicFromMessage(test.msg);
    if (detected !== test.expected) {
      throw new Error(
        `Mensaje "${test.msg}" detectó ${detected}, esperado ${test.expected}`
      );
    }
  }
  
  console.log(`   ✓ ${tests.length} detecciones correctas`);
}

/**
 * Test 5: Mapeo de tópicos a agentes
 */
async function testTopicToAgentMapping() {
  const mappings = [
    { topic: TOPICS.RESERVA, expectedAgent: 'AURORA' },
    { topic: TOPICS.COLISION, expectedAgent: 'AXEL' },
    { topic: TOPICS.SEGURO, expectedAgent: 'ADRIANA' },
    { topic: TOPICS.MARKETING, expectedAgent: 'ENZO' },
    { topic: TOPICS.SALUD, expectedAgent: 'ANGELA' }
  ];
  
  for (const mapping of mappings) {
    const agent = getAgentForTopic(mapping.topic);
    if (agent !== mapping.expectedAgent) {
      throw new Error(
        `Tópico ${mapping.topic} mapeó a ${agent}, esperado ${mapping.expectedAgent}`
      );
    }
  }
  
  console.log(`   ✓ ${mappings.length} mapeos correctos`);
}

/**
 * Test 6: Sistema de handover
 */
async function testHandoverLogic() {
  // Aurora debe derivar a Axel si detecta colisión
  const handover1 = await shouldHandover(
    TEST_USER_ID,
    'Tuve un choque, necesito cotización',
    'AURORA'
  );
  
  if (!handover1.handover || handover1.targetAgent !== 'AXEL') {
    throw new Error('Aurora no derivó correctamente a Axel');
  }
  
  // Axel debe mantenerse activo si usuario sigue hablando de colisión
  const handover2 = await shouldHandover(
    TEST_USER_ID,
    'Las fotos del golpe',
    'AXEL'
  );
  
  if (handover2.handover) {
    throw new Error('Axel no debería hacer handover en este caso');
  }
  
  console.log('   ✓ Lógica de handover correcta');
}

/**
 * Test 7: Tópicos activos
 */
async function testActiveTopics() {
  // Crear tópico activo
  await conversationAdapter.setActiveTopic(
    TEST_USER_ID,
    TOPICS.RESERVA,
    'AURORA',
    { testMode: true }
  );
  
  // Recuperar tópicos activos
  const topics = await conversationAdapter.getActiveTopics(TEST_USER_ID);
  
  if (topics.length === 0) {
    throw new Error('No se encontraron tópicos activos');
  }
  
  const reservaTopic = topics.find(t => t.topic === TOPICS.RESERVA);
  if (!reservaTopic || reservaTopic.status !== 'active') {
    throw new Error('Tópico de reserva no está activo');
  }
  
  console.log(`   ✓ Tópicos activos funcionando (${topics.length} activos)`);
}

/**
 * Test 8: Google Calendar Integration
 */
async function testCalendarConnection() {
  const result = await testCalendarIntegration();
  
  if (!result.success) {
    throw new Error(`Google Calendar: ${result.error}`);
  }
  
  console.log(`   ✓ Google Calendar conectado (${result.calendars?.length || 0} calendarios)`);
}

/**
 * Test 9: Guardar archivos en conversación
 */
async function testFileSaving() {
  await conversationAdapter.saveFile(
    TEST_USER_ID,
    TOPICS.COLISION,
    'AXEL',
    'https://example.com/test-image.jpg',
    'image/jpeg',
    { testMode: true, description: 'Test image' }
  );
  
  const files = await conversationAdapter.getFilesForTopic(
    TEST_USER_ID,
    TOPICS.COLISION
  );
  
  if (files.length === 0) {
    throw new Error('No se guardó el archivo correctamente');
  }
  
  console.log(`   ✓ Archivos guardados correctamente (${files.length} archivos)`);
}

/**
 * Test 10: Limpieza de datos de test
 */
async function cleanupTestData() {
  // Eliminar conversaciones de test
  await postgresAdapter.query(`
    DELETE FROM agent_conversations 
    WHERE user_phone = $1
  `, [TEST_USER_ID]);
  
  // Eliminar archivos de test
  await postgresAdapter.query(`
    DELETE FROM conversation_files 
    WHERE user_phone = $1
  `, [TEST_USER_ID]);
  
  // Eliminar tópicos de test
  await postgresAdapter.query(`
    DELETE FROM active_topics 
    WHERE user_phone = $1
  `, [TEST_USER_ID]);
  
  console.log('   ✓ Datos de test eliminados');
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
  console.log('🚀 INICIANDO TESTS DE INTEGRACIÓN MULTI-AGENTE\n');
  console.log('═'.repeat(60));
  
  // Tests de base de datos
  await runTest('1. Conexión PostgreSQL', testDatabaseConnection);
  await runTest('2. Verificar tablas conversaciones', testConversationTables);
  await runTest('3. Guardar y cargar conversación', testSaveAndLoadConversation);
  
  // Tests de coordinación
  await runTest('4. Detección de tópicos', testTopicDetection);
  await runTest('5. Mapeo tópico → agente', testTopicToAgentMapping);
  await runTest('6. Lógica de handover', testHandoverLogic);
  await runTest('7. Gestión tópicos activos', testActiveTopics);
  
  // Tests de archivos
  await runTest('9. Guardar archivos', testFileSaving);
  
  // Tests de integraciones externas
  await runTest('8. Google Calendar', testCalendarConnection);
  
  // Limpieza
  await runTest('10. Limpieza datos test', cleanupTestData);
  
  // Resumen
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 RESUMEN DE TESTS:\n');
  console.log(`✅ Tests exitosos: ${testsPassed}`);
  console.log(`❌ Tests fallidos: ${testsFailed}`);
  console.log(`📈 Tasa de éxito: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 TODOS LOS TESTS PASARON - Sistema listo para producción!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  ALGUNOS TESTS FALLARON - Revisar errores antes de deployment\n');
    process.exit(1);
  }
}

// Ejecutar
runAllTests().catch(error => {
  console.error('\n💥 ERROR FATAL EN TESTS:', error);
  process.exit(1);
});
