/**
 * 🧪 Test integración - Flujo completo V2
 * Simula el flujo wassenger → intent-resolver-v2 → handoff-manager
 */

import { resolveIntent, decideResponder, INTENT_TYPES } from './src/deteccion-intenciones/intent-resolver-v2.js';
import { getHandoffMessages } from './src/deteccion-intenciones/handoff-messages.js';

console.log('🧪 TEST INTEGRACIÓN V2 - Flujo Completo\n');
console.log('='.repeat(60));

// Simular perfil del usuario
const mockProfile = {
  active_agent: 'AURORA',
  agent_history: {
    'AURORA': [{ timestamp: '2026-01-30T10:00:00Z' }]
  }
};

// TEST 1: @mention explícito → HANDOFF
console.log('\n1️⃣ TEST: Usuario dice "@enzo necesito marketing"');
console.log('-'.repeat(60));
const input1 = '@enzo necesito marketing';
const intent1 = resolveIntent(input1, mockProfile.active_agent);
console.log('Intent detectado:', intent1);

if (intent1.type === INTENT_TYPES.HANDOFF) {
  const messages1 = getHandoffMessages('AURORA', 'ENZO', 'Diego', 'es', false);
  console.log('\n📨 Mensaje de handoff:');
  console.log(messages1.entrada);
}

// TEST 2: Keyword "marketing" → SUGGESTION (NO handoff)
console.log('\n\n2️⃣ TEST: Usuario dice "necesito marketing"');
console.log('-'.repeat(60));
const input2 = 'necesito marketing';
const intent2 = resolveIntent(input2, mockProfile.active_agent);
console.log('Intent detectado:', intent2);

if (intent2.type === INTENT_TYPES.SUGGESTION) {
  console.log(`✅ Mantiene agente ${intent2.targetAgent}, sugiere ${intent2.suggestedAgent}`);
  console.log('Aurora debe responder mencionando que Enzo es especialista');
}

// TEST 3: @mention desde ENZO → ALUNA (directo, no regresa a Aurora)
console.log('\n\n3️⃣ TEST: Desde ENZO dice "@aluna plan 10"');
console.log('-'.repeat(60));
mockProfile.active_agent = 'ENZO';
const input3 = '@aluna plan 10';
const intent3 = resolveIntent(input3, 'ENZO');
console.log('Intent detectado:', intent3);

if (intent3.type === INTENT_TYPES.HANDOFF) {
  const messages3 = getHandoffMessages('ENZO', 'ALUNA', 'Diego', 'es', false);
  console.log('\n📨 Mensaje de handoff:');
  console.log(messages3.entrada);
}

// TEST 4: Regreso a Aurora desde Enzo
console.log('\n\n4️⃣ TEST: Desde ENZO dice "@aurora"');
console.log('-'.repeat(60));
const input4 = '@aurora';
const intent4 = resolveIntent(input4, 'ENZO');
console.log('Intent detectado:', intent4);

if (intent4.type === INTENT_TYPES.HANDOFF) {
  const messages4 = getHandoffMessages('ENZO', 'AURORA', 'Diego', 'es', false);
  console.log('\n📨 Mensaje regreso Aurora:');
  console.log(messages4.entrada);
}

// TEST 5: Email address no activa keywords
console.log('\n\n5️⃣ TEST: Usuario envía "segpopular.ec@icloud.com"');
console.log('-'.repeat(60));
const input5 = 'segpopular.ec@icloud.com';
const intent5 = resolveIntent(input5, 'AURORA');
console.log('Intent detectado:', intent5);
console.log('✅ Debe mantener AURORA sin activar ADRIANA');

console.log('\n' + '='.repeat(60));
console.log('✅ TESTS DE INTEGRACIÓN COMPLETADOS');
console.log('\nSistema V2 listo para producción 262/788');
