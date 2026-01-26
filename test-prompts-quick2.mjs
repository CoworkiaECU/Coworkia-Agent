// 🧪 Test rápido de prompts principales (verifica PROMPTS generados, no respuestas IA)
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
console.log('📤 SYSTEM PROMPT (fragmento relevante):\n');
const fragment1 = test1.systemPrompt.substring(0, 1500);
console.log(fragment1 + '...\n');
console.log('\n' + '─'.repeat(60) + '\n');

// Verificar que el prompt NO contenga "ESPACIOS COWORKING:"
if (test1.systemPrompt.includes('ESPACIOS COWORKING:')) {
  console.log('❌ ERROR: No debe mostrar listado detallado de espacios\n');
} else {
  console.log('✅ CORRECTO: Saludo casual sin detalles\n');
}

// TEST 2: "quiero probar el servicio"
console.log('2️⃣ TEST: "quiero probar el servicio"\n');
console.log('Esperado: Info completa de espacios\n');

const test2 = await procesarMensaje('quiero probar el servicio', perfil, []);
console.log('📤 SYSTEM PROMPT (fragmento relevante):\n');
const fragment = test2.systemPrompt.substring(0, 1500);
console.log(fragment + '...\n');
console.log('\n' + '─'.repeat(60) + '\n');

// Verificar que SÍ contenga espacios
if (test2.systemPrompt.includes('Hot Desk') || test2.systemPrompt.includes('Sala de Reuniones')) {
  console.log('✅ CORRECTO: Muestra info de espacios\n');
} else {
  console.log('❌ ERROR: Debe mostrar Hot Desk y Sala de Reuniones\n');
}

// Verificar que NO mencione OTROS SERVICIOS
if (test2.systemPrompt.includes('OTROS SERVICIOS') || test2.systemPrompt.includes('Adriana') || test2.systemPrompt.includes('Enzo')) {
  console.log('❌ ERROR: No debe mencionar OTROS SERVICIOS\n');
} else {
  console.log('✅ CORRECTO: No menciona servicios desactivados\n');
}

console.log('═══════════════════════════════════════');
console.log('✅ TESTS COMPLETADOS\n');
process.exit(0);
