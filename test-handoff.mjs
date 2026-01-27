#!/usr/bin/env node
/**
 * 🧪 TEST: Sistema de Handoffs
 * Prueba transiciones entre agentes sin tocar producción
 */

import { getHandoffMessages } from './src/deteccion-intenciones/orquestador.js';

console.log('\n🔄 TEST: Sistema de Handoffs\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const testCases = [
  { from: 'AURORA', to: 'ALUNA', user: 'Diego', lang: 'es' },
  { from: 'AURORA', to: 'ENZO', user: 'Diego', lang: 'es' },
  { from: 'ALUNA', to: 'AURORA', user: 'María', lang: 'en' },
  { from: 'ENZO', to: 'PAULA', user: 'Carlos', lang: 'es' },
  { from: 'AURORA', to: 'AXEL', user: 'Ana', lang: 'es' },
  { from: 'ENZO', to: 'ANGELA', user: 'Luis', lang: 'es' },
];

console.log('📝 Probando transiciones de agentes:\n');

testCases.forEach((test, i) => {
  console.log(`${i + 1}. ${test.from} → ${test.to} (${test.user}, ${test.lang})`);
  
  try {
    const messages = getHandoffMessages(test.from, test.to, test.user, test.lang);
    
    if (!messages || !messages.despedida || !messages.entrada) {
      console.log('   ❌ FAIL: Mensajes incompletos o null');
      console.log('   Resultado:', messages);
    } else {
      console.log('   ✅ PASS');
      console.log(`   Despedida: ${messages.despedida.substring(0, 60)}...`);
      console.log(`   Entrada: ${messages.entrada.substring(0, 60)}...`);
    }
  } catch (error) {
    console.log('   ❌ FAIL: Error en getHandoffMessages');
    console.log('   Error:', error.message);
  }
  
  console.log('');
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Test completado\n');
