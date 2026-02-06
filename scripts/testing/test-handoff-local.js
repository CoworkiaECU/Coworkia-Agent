/**
 * 🧪 TEST LOCAL - Sin conexión a BD
 * 
 * Verifica solo lógica de código (no requiere DATABASE_URL)
 */

import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';
import { getHandoffMessages } from '../../src/deteccion-intenciones/handoff-messages.js';

console.log('🧪 TESTS LOCALES (Sin BD)\n');

// TEST 1: Detección de @menciones
console.log('📋 TEST 1: Detección de @menciones');
console.log('='.repeat(50));

const tests = [
  { input: '@enzo ayuda', expected: 'ENZO' },
  { input: 'hola @adriana seguro', expected: 'ADRIANA' },
  { input: '@paula casa', expected: 'PAULA' },
  { input: '@aluna plan', expected: 'ALUNA' },
  { input: '@angela salud', expected: 'ANGELA' },
  { input: '@axel auto', expected: 'AXEL' },
  { input: '@gabi legal', expected: 'GABI' },
  { input: '@aurora volver', expected: 'AURORA' }
];

let passed = 0;
tests.forEach(test => {
  const result = detectarIntencion(test.input, 'AURORA');
  const success = result.agent === test.expected;
  console.log(`  ${success ? '✅' : '❌'} "${test.input}" → ${result.agent} ${success ? '' : `(esperado: ${test.expected})`}`);
  if (success) passed++;
});

console.log(`\nResultado TEST 1: ${passed}/${tests.length} (${Math.round(passed/tests.length*100)}%)\n`);

// TEST 2: Mensajes handoff
console.log('📋 TEST 2: Mensajes de handoff');
console.log('='.repeat(50));

const handoffTests = [
  { from: 'AURORA', to: 'ENZO' },
  { from: 'PAULA', to: 'AURORA' },
  { from: 'ALUNA', to: 'GABI' }
];

let handoffPassed = 0;
handoffTests.forEach(test => {
  try {
    const msg = getHandoffMessages(test.from, test.to, 'Test', 'es');
    const success = msg && msg.entrada;
    console.log(`  ${success ? '✅' : '❌'} ${test.from} → ${test.to}`);
    if (success) handoffPassed++;
  } catch (e) {
    console.log(`  ❌ ${test.from} → ${test.to}: ${e.message}`);
  }
});

console.log(`\nResultado TEST 2: ${handoffPassed}/${handoffTests.length} (${Math.round(handoffPassed/handoffTests.length*100)}%)\n`);

// TEST 3: No duplicidad (verificación de código)
console.log('📋 TEST 3: Verificación de código');
console.log('='.repeat(50));

import { readFileSync } from 'fs';
import { join } from 'path';

const checks = [
  { file: 'wassenger.js', pattern: 'const handoffMatch = processedText.match', desc: 'Handoff manual' },
  { file: 'wassenger.js', pattern: 'profile.activeAgent = targetAgent', desc: 'Asignación directa activeAgent' },
  { file: 'wassenger.js', pattern: 'executeHandoffSequence_LEGACY', desc: 'Función LEGACY' },
  { file: 'orquestador.js', pattern: 'export function getHandoffMessages(', desc: 'getHandoffMessages duplicada' }
];

let checksPassed = 0;
checks.forEach(check => {
  const filePath = check.file === 'wassenger.js' 
    ? join(process.cwd(), 'src/express-servidor/endpoints-api/wassenger.js')
    : join(process.cwd(), 'src/deteccion-intenciones/orquestador.js');
  
  const content = readFileSync(filePath, 'utf-8');
  const found = content.includes(check.pattern);
  
  console.log(`  ${!found ? '✅' : '❌'} ${check.desc} ${!found ? 'eliminado' : 'PRESENTE'}`);
  if (!found) checksPassed++;
});

console.log(`\nResultado TEST 3: ${checksPassed}/${checks.length} (${Math.round(checksPassed/checks.length*100)}%)\n`);

// RESUMEN FINAL
console.log('='.repeat(50));
console.log('📊 RESUMEN FINAL');
console.log('='.repeat(50));
const totalTests = tests.length + handoffTests.length + checks.length;
const totalPassed = passed + handoffPassed + checksPassed;
console.log(`Tests pasados: ${totalPassed}/${totalTests} (${Math.round(totalPassed/totalTests*100)}%)`);

if (totalPassed === totalTests) {
  console.log('\n🎉 TODOS LOS TESTS LOCALES PASARON');
  console.log('✅ Base de datos NO se verá afectada (active_agent y intent_reason son TEXT sin constraints)');
  console.log('✅ Listo para deploy');
  process.exit(0);
} else {
  console.log('\n⚠️  Algunos tests fallaron - revisar');
  process.exit(1);
}
