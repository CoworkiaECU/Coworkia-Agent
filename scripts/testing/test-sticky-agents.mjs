#!/usr/bin/env node
/**
 * 🧪 TEST: Sticky Agents - Validar que agentes especializados se mantienen
 * Prueba la nueva lógica implementada en detectar-intencion.js
 */

import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';

console.log('🧪 ════════════════════════════════════════════════');
console.log('   TEST: STICKY AGENTS (Agentes Pegajosos)');
console.log('════════════════════════════════════════════════\n');

const tests = [
  {
    name: 'Test 1: Paula activa + keyword Aurora ("cuánto cuesta")',
    mensaje: 'cuánto cuesta esta casa?',
    activeAgent: 'PAULA',
    esperado: 'PAULA',
    descripcion: 'Paula debe MANTENER control aunque "cuánto" es keyword de Aurora'
  },
  {
    name: 'Test 2: Axel activo + pregunta sobre servicio',
    mensaje: 'cuándo puedo llevar el auto?',
    activeAgent: 'AXEL',
    esperado: 'AXEL',
    descripcion: 'Axel debe MANTENER control con preguntas de logística'
  },
  {
    name: 'Test 3: Aurora activa + keyword Aluna ("plan")',
    mensaje: 'me interesa un plan mensual',
    activeAgent: 'AURORA',
    esperado: 'AURORA',
    descripcion: 'Aurora detecta keyword Aluna pero NO cambia automáticamente'
  },
  {
    name: 'Test 4: Aurora activa + keyword Aurora ("reserva")',
    mensaje: 'quiero hacer una reserva',
    activeAgent: 'AURORA',
    esperado: 'AURORA',
    descripcion: 'Aurora mantiene control con sus propias keywords'
  },
  {
    name: 'Test 5: Enzo activo + mensaje general',
    mensaje: 'gracias por la información',
    activeAgent: 'ENZO',
    esperado: 'ENZO',
    descripcion: 'Enzo mantiene control con mensaje neutro'
  },
  {
    name: 'Test 6: Paula activa + múltiples keywords',
    mensaje: 'cuánto cuesta y cómo puedo pagar?',
    activeAgent: 'PAULA',
    esperado: 'PAULA',
    descripcion: 'Paula mantiene incluso con múltiples keywords de Aurora'
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
  console.log(`\n[${idx + 1}/${tests.length}] ${test.name}`);
  console.log(`   📝 Mensaje: "${test.mensaje}"`);
  console.log(`   🤖 Agente activo: ${test.activeAgent}`);
  console.log(`   ✅ Esperado: ${test.esperado}`);
  
  const resultado = detectarIntencion(test.mensaje, test.activeAgent);
  
  console.log(`   📊 Resultado: ${resultado.agent}`);
  console.log(`   💭 Razón: ${resultado.reason}`);
  
  if (resultado.flags) {
    console.log(`   🏴 Flags:`, JSON.stringify(resultado.flags, null, 2));
  }
  
  if (resultado.agent === test.esperado) {
    console.log(`   ✅ PASS - ${test.descripcion}`);
    passed++;
  } else {
    console.log(`   ❌ FAIL - Se esperaba ${test.esperado} pero obtuvo ${resultado.agent}`);
    console.log(`   ⚠️  ${test.descripcion}`);
    failed++;
  }
});

console.log('\n════════════════════════════════════════════════');
console.log('📊 RESUMEN:');
console.log(`   ✅ Tests pasados: ${passed}/${tests.length}`);
console.log(`   ❌ Tests fallados: ${failed}/${tests.length}`);

if (failed === 0) {
  console.log('\n🎉 TODOS LOS TESTS PASARON - Sistema Sticky Agents funcionando correctamente');
  process.exit(0);
} else {
  console.log('\n⚠️  ALGUNOS TESTS FALLARON - Revisar implementación');
  process.exit(1);
}
