// scripts/test-high-intent-detection.mjs
// Test para verificar detección de keywords de alto interés

import dotenv from 'dotenv';
dotenv.config();

import { detectHighIntentKeywords, getAllCategories, getKeywordsByCategory } from '../src/servicios/aluna-high-intent-detector.js';

const testMessages = [
  // Pricing
  { text: 'Hola, cuánto cuesta el plan 30?', expectedCategory: 'pricing' },
  { text: 'Me interesa saber el precio exacto', expectedCategory: 'pricing' },
  { text: 'cual es el costo mensual?', expectedCategory: 'pricing' },
  
  // Availability
  { text: 'cuando puedo visitar las oficinas?', expectedCategory: 'availability' },
  { text: 'Quisiera saber los horarios disponibles', expectedCategory: 'availability' },
  { text: 'Esta disponible para mañana?', expectedCategory: 'availability' },
  
  // Commitment
  { text: 'me interesa contratar una oficina', expectedCategory: 'commitment' },
  { text: 'Quiero tomar el plan full', expectedCategory: 'commitment' },
  { text: 'Como contrato el servicio?', expectedCategory: 'commitment' },
  
  // Urgency
  { text: 'Lo necesito urgente para esta semana', expectedCategory: 'urgency' },
  { text: 'puedo empezar ya?', expectedCategory: 'urgency' },
  { text: 'necesito espacio lo antes posible', expectedCategory: 'urgency' },
  
  // No detection
  { text: 'Hola, buenos días', expectedCategory: null },
  { text: 'Gracias por la información', expectedCategory: null },
  { text: 'Ok entendido', expectedCategory: null },
];

console.log('🧪 TEST: High Intent Detection\n');

// Mostrar keywords configuradas
console.log('📋 KEYWORDS CONFIGURADAS:\n');
const categories = getAllCategories();
categories.forEach(cat => {
  const keywords = getKeywordsByCategory(cat);
  console.log(`  ${cat}: ${keywords.length} keywords`);
  console.log(`    ${keywords.slice(0, 3).join(', ')}...`);
});

console.log('\n🔍 TESTS:\n');

let passed = 0;
let failed = 0;

testMessages.forEach((test, idx) => {
  const detection = detectHighIntentKeywords(test.text);
  const expected = test.expectedCategory;
  const actual = detection.category;
  
  const success = (expected === null && !detection.detected) || (expected === actual);
  
  if (success) {
    passed++;
    console.log(`✅ Test ${idx + 1}: PASS`);
    console.log(`   Mensaje: "${test.text.substring(0, 50)}..."`);
    if (detection.detected) {
      console.log(`   Detectado: ${detection.category} ("${detection.keyword}")`);
    } else {
      console.log(`   No detectado (esperado)`);
    }
  } else {
    failed++;
    console.log(`❌ Test ${idx + 1}: FAIL`);
    console.log(`   Mensaje: "${test.text}"`);
    console.log(`   Esperado: ${expected || 'no detection'}`);
    console.log(`   Obtenido: ${actual || 'no detection'}`);
  }
  console.log('');
});

console.log('═══════════════════════════════════════');
console.log(`RESULTADOS: ${passed} PASS / ${failed} FAIL`);

if (failed === 0) {
  console.log('✅ TODOS LOS TESTS PASARON');
  process.exit(0);
} else {
  console.log('❌ ALGUNOS TESTS FALLARON');
  process.exit(1);
}
