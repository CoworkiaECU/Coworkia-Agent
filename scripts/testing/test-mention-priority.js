#!/usr/bin/env node
// Test de prioridad de @menciones sobre otras detecciones
// Verifica que @menciones SIEMPRE tengan prioridad máxima

import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST: PRIORIDAD DE @MENCIONES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const tests = [
  {
    name: '✅ @enzo con keywords de venta de agentes',
    input: '@enzo dime que puede hacer un sistema como este en mi empresa',
    currentAgent: 'AURORA',
    expected: {
      agent: 'ENZO',
      flags: { agentHandoff: true }
    }
  },
  {
    name: '✅ @paula con keywords de venta de agentes',
    input: '@paula quiero saber qué puede hacer un agente virtual como tú',
    currentAgent: 'AURORA',
    expected: {
      agent: 'PAULA',
      flags: { agentHandoff: true }
    }
  },
  {
    name: '✅ @aluna con texto de sistema',
    input: '@aluna como funciona el sistema de membresías',
    currentAgent: 'AURORA',
    expected: {
      agent: 'ALUNA',
      flags: { agentHandoff: true }
    }
  },
  {
    name: '✅ @aurora desde otro agente con keywords',
    input: '@aurora necesito información del sistema',
    currentAgent: 'ENZO',
    expected: {
      agent: 'AURORA',
      flags: { agentHandoff: true, returningToAurora: true }
    }
  },
  {
    name: '✅ @enzo simple sin keywords',
    input: '@enzo hola',
    currentAgent: 'AURORA',
    expected: {
      agent: 'ENZO',
      flags: { agentHandoff: true }
    }
  },
  {
    name: '❌ Sin @mención CON keywords = detección de promoción',
    input: 'dime que puede hacer un sistema como este en mi empresa',
    currentAgent: 'AURORA',
    expected: {
      agent: 'AURORA',
      flags: { virtualAgentSalesPromo: true }
    }
  },
  {
    name: '✅ @adriana con keywords de seguros',
    input: '@adriana necesito un seguro para mi empresa',
    currentAgent: 'AURORA',
    expected: {
      agent: 'ADRIANA',
      flags: { agentHandoff: true }
    }
  },
  {
    name: '✅ @axel con keywords de sistema',
    input: '@axel cómo funciona el sistema de colisiones',
    currentAgent: 'AURORA',
    expected: {
      agent: 'AXEL',
      flags: { agentHandoff: true }
    }
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
  console.log(`\n${idx + 1}. ${test.name}`);
  console.log(`   Input: "${test.input}"`);
  console.log(`   Current: ${test.currentAgent}`);
  
  const result = detectarIntencion(test.input, test.currentAgent);
  
  console.log(`   Detected: ${result.agent} | Reason: ${result.reason}`);
  console.log(`   Flags:`, result.flags);
  
  // Verificaciones
  const agentMatch = result.agent === test.expected.agent;
  
  // Verificar flags esperados
  let flagsMatch = true;
  for (const [key, value] of Object.entries(test.expected.flags)) {
    if (result.flags[key] !== value) {
      flagsMatch = false;
      console.log(`   ❌ Flag mismatch: expected ${key}=${value}, got ${result.flags[key]}`);
    }
  }
  
  const testPassed = agentMatch && flagsMatch;
  
  if (testPassed) {
    console.log(`   ✅ PASS`);
    passed++;
  } else {
    console.log(`   ❌ FAIL`);
    if (!agentMatch) {
      console.log(`      Expected agent: ${test.expected.agent}, got: ${result.agent}`);
    }
    failed++;
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 RESULTADOS: ${passed}/${tests.length} tests passed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failed > 0) {
  console.log(`❌ ${failed} test(s) fallaron`);
  process.exit(1);
} else {
  console.log('✅ Todos los tests pasaron - @menciones tienen PRIORIDAD MÁXIMA');
  process.exit(0);
}
