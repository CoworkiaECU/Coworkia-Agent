/**
 * 🧪 TEST MANUAL: Prompts Especiales
 * 
 * Prueba las 2 detecciones nuevas:
 * 1. Saludo con interés en servicio
 * 2. Venta de agentes virtuales (ya existía, verificar que sigue funcionando)
 */

import { detectarIntencion, detectarSaludoConInteresServicio } from '../../src/deteccion-intenciones/detectar-intencion.js';

console.log('🧪 TESTING: Prompts Especiales\n');
console.log('=' .repeat(60));

// ============================================================
// TEST 1: Saludo con interés en servicio
// ============================================================
console.log('\n📝 TEST 1: Saludo con interés en servicio');
console.log('-'.repeat(60));

const test1Cases = [
  '¡Hola Coworkia! quiero probar el servicio ☕️',
  'Hola quiero probar el servicio',
  'Buenos días necesito el servicio',
  'Buenas tardes quiero usar el servicio',
  'Hola Coworkia me interesa',
  'Hola' // Este NO debe detectarse (saludo simple)
];

test1Cases.forEach((testCase, i) => {
  const result = detectarIntencion(testCase, 'AURORA', {});
  const isServiceInterest = result.flags?.serviceInterest === true;
  const passed = (i < 5 && isServiceInterest) || (i === 5 && !isServiceInterest);
  
  console.log(`\n${i + 1}. "${testCase}"`);
  console.log(`   Agente: ${result.agent}`);
  console.log(`   Reason: ${result.reason}`);
  console.log(`   serviceInterest: ${isServiceInterest}`);
  console.log(`   ✅ ${passed ? 'PASS' : '❌ FAIL'}`);
});

// ============================================================
// TEST 2: Venta de agentes virtuales
// ============================================================
console.log('\n\n📝 TEST 2: Venta de agentes virtuales');
console.log('-'.repeat(60));

const test2Cases = [
  'Aurora, quiero saber ¿qué puede hacer un Agente Virtual como tú para mi empresa?',
  'que puede hacer un agente virtual para mi negocio',
  'quiero un sistema como tu',
  'necesito un chatbot como este',
  'Aurora me interesa tu sistema', // Debería detectarse
  'hola aurora' // Este NO debe detectarse
];

test2Cases.forEach((testCase, i) => {
  const result = detectarIntencion(testCase, 'AURORA', {});
  const isVirtualAgent = result.flags?.virtualAgentSalesPromo === true;
  const hasSkipFlag = result.flags?.skipDefaultGreeting === true;
  const passed = (i < 5 && isVirtualAgent) || (i === 5 && !isVirtualAgent);
  
  console.log(`\n${i + 1}. "${testCase}"`);
  console.log(`   Agente: ${result.agent}`);
  console.log(`   Reason: ${result.reason}`);
  console.log(`   virtualAgentSalesPromo: ${isVirtualAgent}`);
  console.log(`   skipDefaultGreeting: ${hasSkipFlag}`);
  console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
});

// ============================================================
// TEST 3: Prioridad (serviceInterest debe ejecutarse ANTES)
// ============================================================
console.log('\n\n📝 TEST 3: Prioridad de detección');
console.log('-'.repeat(60));

const test3Case = 'Hola Coworkia quiero probar el servicio de agente virtual';
const result3 = detectarIntencion(test3Case, 'AURORA', {});

console.log(`\nInput: "${test3Case}"`);
console.log(`Agente: ${result3.agent}`);
console.log(`Reason: ${result3.reason}`);
console.log(`serviceInterest: ${result3.flags?.serviceInterest}`);
console.log(`virtualAgentSalesPromo: ${result3.flags?.virtualAgentSalesPromo}`);
console.log(`\n⚠️ Debe detectar serviceInterest (tiene "quiero probar el servicio")`);
console.log(`${result3.flags?.serviceInterest ? '✅ PASS - Prioridad correcta' : '❌ FAIL - Prioridad incorrecta'}`);

// ============================================================
// RESUMEN
// ============================================================
console.log('\n\n' + '='.repeat(60));
console.log('📊 RESUMEN DE TESTS');
console.log('='.repeat(60));
console.log('\n✅ Si todos los tests pasaron, el sistema está listo.');
console.log('❌ Si alguno falló, revisar detectar-intencion.js');
console.log('\n🚀 Próximo paso: Probar en el servidor real con WhatsApp\n');
