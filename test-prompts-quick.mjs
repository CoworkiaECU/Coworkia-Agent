// 🧪 Test rápido de prompts principales
import { procesarMensaje } from './src/deteccion-intenciones/orquestador.js';

console.log('🧪 TEST RÁPIDO DE PROMPTS\n');
console.log('═══════════════════════════════════════\n');

const perfil = {
  userId: '+593999999999',
  name: 'Diego Test',
  activeAgent: 'AURORA',
  freeTrialUsed: false,
  userLanguage: 'es'
};

// TEST 1: Saludo simple "hola"
console.log('1️⃣ TEST: Saludo simple "hola"\n');
console.log('Esperado: Saludo casual sin espacios detallados\n');

const test1 = await procesarMensaje('hola', perfil, []);
console.log('📤 RESPUESTA:\n');
console.log(test1?.respuesta || test1?.response || 'No hay respuesta');
console.log('\n' + '─'.repeat(60) + '\n');

// Verificar que NO contenga "ESPACIOS COWORKING:"
const resp1 = test1?.respuesta || test1?.response || '';
if (resp1.includes('ESPACIOS COWORKING:')) {
  console.log('❌ ERROR: No debe mostrar ESPACIOS COWORKING en saludo simple\n');
} else {
  console.log('✅ CORRECTO: Saludo casual sin detalles\n');
}

// TEST 2: "quiero probar el servicio"
console.log('2️⃣ TEST: "quiero probar el servicio"\n');
console.log('Esperado: Info completa de espacios\n');

const test2 = await procesarMensaje('quiero probar el servicio', perfil, []);
console.log('📤 RESPUESTA:\n');
console.log(test2?.respuesta || test2?.response || 'No hay respuesta');
console.log('\n' + '─'.repeat(60) + '\n');

// Verificar que SÍ contenga espacios
const resp2 = test2?.respuesta || test2?.response || '';
if (resp2.includes('Hot Desk') || resp2.includes('Sala de Reuniones')) {
  console.log('✅ CORRECTO: Muestra info de espacios\n');
} else {
  console.log('❌ ERROR: Debe mostrar Hot Desk y Sala de Reuniones\n');
}

// Verificar que NO mencione OTROS SERVICIOS
if (resp2.includes('OTROS SERVICIOS') || resp2.includes('Adriana') || resp2.includes('Enzo')) {
  console.log('❌ ERROR: No debe mencionar OTROS SERVICIOS\n');
} else {
  console.log('✅ CORRECTO: No menciona servicios desactivados\n');
}

console.log('═══════════════════════════════════════');
console.log('✅ TESTS COMPLETADOS\n');
process.exit(0);
