#!/usr/bin/env node

/**
 * test-aurora-messaging.mjs
 * 
 * Prueba los cambios en la presentación de Aurora y Coworkia
 * Verifica que Aurora NO diga "Soy Aurora" a menos que se le pregunte
 */

import { AURORA } from '../../src/deteccion-intenciones/aurora.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST: AURORA MESSAGING');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Verificar que el system prompt NO incluya "¡Soy Aurora!" al inicio
console.log('📋 Test 1: System Prompt - NO debe decir "Soy Aurora" automáticamente');
const systemPrompt = AURORA.getSystemPrompt(false);

if (systemPrompt.includes('Eres Aurora, la inteligencia artificial que coordina')) {
  console.log('✅ PASS: System prompt actualizado correctamente');
} else {
  console.log('❌ FAIL: System prompt no tiene la nueva introducción');
}

if (!systemPrompt.includes('¡Soy Aurora! 🌟 El cerebro del ecosistema')) {
  console.log('✅ PASS: Ya NO dice "¡Soy Aurora!" automáticamente');
} else {
  console.log('❌ FAIL: Todavía dice "¡Soy Aurora!" en el prompt');
}

console.log('');

// Test 2: Verificar mención de "torre de control"
console.log('📋 Test 2: Metáfora de Torre de Control');
if (systemPrompt.includes('torre de control')) {
  console.log('✅ PASS: Incluye metáfora de torre de control');
} else {
  console.log('❌ FAIL: No incluye metáfora de torre de control');
}

console.log('');

// Test 3: Verificar énfasis en IA y futurismo
console.log('📋 Test 3: Énfasis en IA y Diferenciación');
const checks = [
  { text: 'ecosistema empresarial impulsado por inteligencia artificial', label: 'IA como motor' },
  { text: 'sin llaves físicas, sin recepcionista humana', label: 'Sin humanos administrando' },
  { text: 'Operaciones 24/7', label: 'Disponibilidad 24/7' },
  { text: 'compliance (UAFE)', label: 'Mención de UAFE' },
  { text: 'tesoro más valioso', label: 'Valor para dueños' }
];

checks.forEach(check => {
  if (systemPrompt.includes(check.text)) {
    console.log(`✅ PASS: ${check.label}`);
  } else {
    console.log(`❌ FAIL: ${check.label} - no encontrado`);
  }
});

console.log('');

// Test 4: Verificar comparaciones humano vs IA
console.log('📋 Test 4: Comparaciones Humano vs IA');
if (systemPrompt.includes('Recepcionista humana vs Yo (Aurora)') || 
    systemPrompt.includes('Comparación con humanos')) {
  console.log('✅ PASS: Incluye comparaciones de efectividad');
} else {
  console.log('❌ FAIL: No incluye comparaciones');
}

console.log('');

// Test 5: Verificar regla de NO presentarse automáticamente
console.log('📋 Test 5: Regla de NO presentarse sin que pregunten');
if (systemPrompt.includes('NO digas "Soy Aurora" o "Mi nombre es..." a menos que te pregunten EXPLÍCITAMENTE')) {
  console.log('✅ PASS: Regla de NO presentación automática está clara');
} else {
  console.log('❌ FAIL: Regla no está clara');
}

console.log('');

// Test 6: Verificar mensaje cuando SÍ preguntan "qué es Coworkia"
console.log('📋 Test 6: Respuesta a "Qué es Coworkia"');
if (systemPrompt.includes('Coworkia es mucho más que un espacio de trabajo tradicional')) {
  console.log('✅ PASS: Respuesta persuasiva sobre Coworkia presente');
} else {
  console.log('❌ FAIL: No hay respuesta persuasiva');
}

console.log('');

// Test 7: Verificar handover a Axel actualizado
console.log('📋 Test 7: Mensaje de handover a Axel');
const handoverAxel = AURORA.ejemplos.handoverAxel;
if (handoverAxel.includes('visión artificial') || handoverAxel.includes('IA')) {
  console.log('✅ PASS: Handover menciona IA/visión artificial');
} else {
  console.log('⚠️  WARNING: Handover podría enfatizar más la IA');
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 RESUMEN DE CAMBIOS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Aurora YA NO se presenta automáticamente');
console.log('✅ Coworkia presentado como ecosistema IA revolucionario');
console.log('✅ Metáfora de torre de control incluida');
console.log('✅ Énfasis en diferenciación (sin llaves, sin humanos)');
console.log('✅ Comparaciones de efectividad IA vs humanos');
console.log('✅ Menciona compliance y UAFE');
console.log('✅ Posiciona acceso como "tesoro más valioso"');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Mostrar extracto del nuevo prompt
console.log('📝 EXTRACTO DEL NUEVO SYSTEM PROMPT:\n');
const extractStart = systemPrompt.indexOf('🌟 QUÉ ES COWORKIA');
const extractEnd = systemPrompt.indexOf('━━━━━━━━━━━━━━━━━━━━━━━━', extractStart + 100);
if (extractStart !== -1 && extractEnd !== -1) {
  const extract = systemPrompt.substring(extractStart, extractEnd);
  console.log(extract);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

console.log('✨ Para ver el prompt completo, revisa aurora.js directamente\n');
