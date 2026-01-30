/**
 * 🧪 Test rápido - Handoff Messages V2
 */

import { getHandoffMessages, getEntryMessage, getAuroraReturnMessage } from './src/deteccion-intenciones/handoff-messages.js';

console.log('🧪 Testing Handoff Messages V2\n');

// Test 1: Primera vez con Enzo
console.log('1️⃣ Primera vez con Enzo:');
const test1 = getHandoffMessages(null, 'ENZO', 'Diego', 'es', false);
console.log(test1.entrada);
console.log('');

// Test 2: Handoff Aurora → Aluna
console.log('2️⃣ Handoff Aurora → Aluna:');
const test2 = getHandoffMessages('AURORA', 'ALUNA', 'Diego', 'es', false);
console.log(test2.entrada);
console.log('');

// Test 3: Regreso a Aurora desde Enzo
console.log('3️⃣ Regreso a Aurora desde Enzo:');
const test3 = getHandoffMessages('ENZO', 'AURORA', 'Diego', 'es', false);
console.log(test3.entrada);
console.log('');

// Test 4: Usuario returning a Enzo
console.log('4️⃣ Returning user con Enzo:');
const test4 = getHandoffMessages('AURORA', 'ENZO', 'Diego', 'es', true);
console.log(test4.entrada);
console.log('');

// Test 5: Inglés - Handoff Angela → Axel
console.log('5️⃣ English - Handoff Angela → Axel:');
const test5 = getHandoffMessages('ANGELA', 'AXEL', 'John', 'en', false);
console.log(test5.entrada);
console.log('');

console.log('✅ Tests completados - Verificar mensajes arriba');
