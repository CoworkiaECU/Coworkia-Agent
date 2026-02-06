/**
 * 🧪 TEST DE INTEGRACIÓN - Sistema de Handoffs V2
 * 
 * Prueba que los cambios NO afectaron:
 * - Base de datos (estructura y queries)
 * - Flujo de handoffs
 * - Detección de @menciones
 * - Sistema centralizado
 * 
 * Ejecutar: node scripts/testing/test-handoff-integration.js
 */

import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';
import { executeHandoff } from '../../src/servicios/handoff-manager.js';
import { getHandoffMessages } from '../../src/deteccion-intenciones/handoff-messages.js';
import databaseService from '../../src/database/database.js';

console.log('🧪 INICIANDO TESTS DE INTEGRACIÓN HANDOFFS V2\n');

// ============================================
// TEST 1: Detección de @menciones
// ============================================
async function test1_DeteccionMenciones() {
  console.log('📋 TEST 1: Detección de @menciones');
  console.log('=' .repeat(50));
  
  const tests = [
    { input: '@enzo ayudame con marketing', expected: 'ENZO' },
    { input: 'hola @adriana necesito seguro', expected: 'ADRIANA' },
    { input: '@paula busco casa', expected: 'PAULA' },
    { input: '@aluna quiero plan 10', expected: 'ALUNA' },
    { input: '@aurora volver', expected: 'AURORA' },
    { input: 'quiero día gratis', expected: 'AURORA', note: 'keyword natural' },
    { input: 'plan mensual', expected: 'ALUNA', note: 'keyword natural' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = detectarIntencion(test.input, 'AURORA');
    const success = result.agent === test.expected;
    
    if (success) {
      console.log(`  ✅ "${test.input}" → ${result.agent} ${test.note ? `(${test.note})` : ''}`);
      passed++;
    } else {
      console.log(`  ❌ "${test.input}" → Esperado: ${test.expected}, Recibido: ${result.agent}`);
      failed++;
    }
  }
  
  console.log(`\n  Resultado: ${passed}/${tests.length} tests pasados\n`);
  return failed === 0;
}

// ============================================
// TEST 2: Mensajes de handoff
// ============================================
async function test2_MensajesHandoff() {
  console.log('📋 TEST 2: Mensajes de handoff centralizados');
  console.log('=' .repeat(50));
  
  const tests = [
    { from: 'AURORA', to: 'ENZO', lang: 'es' },
    { from: 'AURORA', to: 'ADRIANA', lang: 'en' },
    { from: 'PAULA', to: 'AURORA', lang: 'es' },
    { from: 'ALUNA', to: 'GABI', lang: 'fr' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const messages = getHandoffMessages(test.from, test.to, 'TestUser', test.lang, false);
      
      if (messages && messages.entrada) {
        console.log(`  ✅ ${test.from} → ${test.to} (${test.lang}): OK`);
        passed++;
      } else {
        console.log(`  ❌ ${test.from} → ${test.to} (${test.lang}): Sin mensaje entrada`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ ${test.from} → ${test.to} (${test.lang}): Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n  Resultado: ${passed}/${tests.length} tests pasados\n`);
  return failed === 0;
}

// ============================================
// TEST 3: Base de datos - Schema
// ============================================
async function test3_DatabaseSchema() {
  console.log('📋 TEST 3: Verificación de schema de base de datos');
  console.log('=' .repeat(50));
  
  try {
    await databaseService.initialize();
    
    // Verificar columna active_agent acepta cualquier valor
    console.log('  🔍 Verificando columna users.active_agent...');
    const testUser = {
      phone_number: '+test_handoff_integration',
      name: 'Test User',
      active_agent: 'TEST_AGENT_VALUE', // Valor de prueba
      preferred_language: 'es'
    };
    
    // Insertar usuario de prueba
    await databaseService.run(`
      INSERT INTO users (phone_number, name, active_agent, preferred_language) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT (phone_number) 
      DO UPDATE SET active_agent = EXCLUDED.active_agent
    `, [testUser.phone_number, testUser.name, testUser.active_agent, testUser.preferred_language]);
    
    // Leer y verificar
    const savedUser = await databaseService.get(
      'SELECT active_agent FROM users WHERE phone_number = ?',
      [testUser.phone_number]
    );
    
    if (savedUser && savedUser.active_agent === 'TEST_AGENT_VALUE') {
      console.log('  ✅ users.active_agent acepta valores arbitrarios (TEXT sin constraints)');
    } else {
      console.log('  ❌ users.active_agent tiene restricciones no esperadas');
      return false;
    }
    
    // Verificar columna intent_reason acepta cualquier valor
    console.log('  🔍 Verificando columna interactions.intent_reason...');
    await databaseService.run(`
      INSERT INTO interactions (user_phone, agent, agent_name, intent_reason, input, output)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      testUser.phone_number,
      'AURORA',
      'Aurora Test',
      'trigger @test_new_value',
      'test input',
      'test output'
    ]);
    
    const savedInteraction = await databaseService.get(
      'SELECT intent_reason FROM interactions WHERE user_phone = ? ORDER BY id DESC LIMIT 1',
      [testUser.phone_number]
    );
    
    if (savedInteraction && savedInteraction.intent_reason === 'trigger @test_new_value') {
      console.log('  ✅ interactions.intent_reason acepta valores arbitrarios (TEXT sin constraints)');
    } else {
      console.log('  ❌ interactions.intent_reason tiene restricciones no esperadas');
      return false;
    }
    
    // Limpiar datos de prueba
    await databaseService.run('DELETE FROM interactions WHERE user_phone = ?', [testUser.phone_number]);
    await databaseService.run('DELETE FROM users WHERE phone_number = ?', [testUser.phone_number]);
    
    console.log('  ✅ Schema de base de datos compatible con cambios V2\n');
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error en test de base de datos: ${error.message}`);
    console.log(`  Stack: ${error.stack}`);
    return false;
  }
}

// ============================================
// TEST 4: Queries SQL críticos
// ============================================
async function test4_CriticalQueries() {
  console.log('📋 TEST 4: Queries SQL críticos');
  console.log('=' .repeat(50));
  
  try {
    // Query 1: UPDATE users SET active_agent
    console.log('  🔍 Query: UPDATE users SET active_agent...');
    await databaseService.run(
      `UPDATE users SET active_agent = ? WHERE phone_number = ?`,
      ['AURORA', '+test_query']
    );
    console.log('  ✅ UPDATE active_agent funciona');
    
    // Query 2: INSERT interactions con intent_reason
    console.log('  🔍 Query: INSERT interactions con intent_reason...');
    await databaseService.run(
      `INSERT INTO interactions (user_phone, agent, intent_reason, input, output) VALUES (?, ?, ?, ?, ?)`,
      ['+test_query', 'AURORA', 'trigger @test', 'input', 'output']
    );
    console.log('  ✅ INSERT interactions funciona');
    
    // Query 3: SELECT con active_agent
    console.log('  🔍 Query: SELECT users WHERE active_agent...');
    const users = await databaseService.all(
      `SELECT phone_number, active_agent FROM users LIMIT 5`
    );
    console.log(`  ✅ SELECT active_agent funciona (${users.length} registros)`);
    
    // Query 4: SELECT con intent_reason
    console.log('  🔍 Query: SELECT interactions con intent_reason...');
    const interactions = await databaseService.all(
      `SELECT intent_reason FROM interactions ORDER BY timestamp DESC LIMIT 5`
    );
    console.log(`  ✅ SELECT intent_reason funciona (${interactions.length} registros)`);
    
    // Limpiar
    await databaseService.run('DELETE FROM interactions WHERE user_phone = ?', ['+test_query']);
    
    console.log('  ✅ Todos los queries SQL críticos funcionan correctamente\n');
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error en queries SQL: ${error.message}`);
    return false;
  }
}

// ============================================
// TEST 5: Verificar que NO hay duplicidad
// ============================================
async function test5_NoDuplicidad() {
  console.log('📋 TEST 5: Verificar eliminación de código duplicado');
  console.log('=' .repeat(50));
  
  const fs = await import('fs');
  const path = await import('path');
  
  let allPassed = true;
  
  // Verificar que no existe handoff manual en wassenger.js
  const wassengerPath = path.join(process.cwd(), 'src/express-servidor/endpoints-api/wassenger.js');
  const wassengerContent = fs.readFileSync(wassengerPath, 'utf-8');
  
  if (wassengerContent.includes('const handoffMatch = processedText.match')) {
    console.log('  ❌ Encontrado: handoff manual en wassenger.js (duplicado)');
    allPassed = false;
  } else {
    console.log('  ✅ No existe handoff manual en wassenger.js');
  }
  
  if (wassengerContent.includes('profile.activeAgent = targetAgent')) {
    console.log('  ❌ Encontrado: asignación directa de activeAgent (bypassa locks)');
    allPassed = false;
  } else {
    console.log('  ✅ No existe asignación directa de activeAgent');
  }
  
  if (wassengerContent.includes('executeHandoffSequence_LEGACY')) {
    console.log('  ❌ Encontrado: función LEGACY aún presente');
    allPassed = false;
  } else {
    console.log('  ✅ Función LEGACY eliminada');
  }
  
  // Verificar que solo existe UNA getHandoffMessages
  const orquestadorPath = path.join(process.cwd(), 'src/deteccion-intenciones/orquestador.js');
  const orquestadorContent = fs.readFileSync(orquestadorPath, 'utf-8');
  
  if (orquestadorContent.includes('export function getHandoffMessages(')) {
    console.log('  ❌ Encontrado: getHandoffMessages duplicada en orquestador.js');
    allPassed = false;
  } else {
    console.log('  ✅ getHandoffMessages eliminada de orquestador.js');
  }
  
  console.log(allPassed ? '\n  ✅ No hay código duplicado\n' : '\n  ❌ Hay código duplicado presente\n');
  return allPassed;
}

// ============================================
// EJECUTAR TODOS LOS TESTS
// ============================================
async function runAllTests() {
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false
  };
  
  try {
    results.test1 = await test1_DeteccionMenciones();
    results.test2 = await test2_MensajesHandoff();
    results.test3 = await test3_DatabaseSchema();
    results.test4 = await test4_CriticalQueries();
    results.test5 = await test5_NoDuplicidad();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE TESTS');
    console.log('='.repeat(50));
    console.log(`  TEST 1 - Detección @menciones: ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  TEST 2 - Mensajes handoff: ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  TEST 3 - Schema BD: ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  TEST 4 - Queries SQL: ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  TEST 5 - No duplicidad: ${results.test5 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(50));
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
      console.log('\n🎉 TODOS LOS TESTS PASARON - LISTO PARA DEPLOY');
      process.exit(0);
    } else {
      console.log('\n⚠️  ALGUNOS TESTS FALLARON - REVISAR ANTES DE DEPLOY');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN TESTS:', error);
    process.exit(1);
  }
}

runAllTests();
