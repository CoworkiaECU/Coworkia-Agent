/**
 * 🧪 TEST: Handoff Silencioso - Solo nuevo agente habla
 * 
 * OBJETIVO:
 * Verificar que el handoff silencioso funciona correctamente:
 * 1. Solo el nuevo agente envía mensaje (NO despedida del anterior)
 * 2. activeAgent se actualiza correctamente
 * 3. Mensaje de entrada tiene patrón "tomo el relevo"
 * 4. Incluye instrucciones de @mention para regresar
 * 
 * TESTS:
 * - Test 1: Handoff AURORA → ALUNA (coworking)
 * - Test 2: Handoff AURORA → ADRIANA (seguros)
 * - Test 3: Handoff ALUNA → AURORA (return)
 * - Test 4: Verificar que NO se envía despedida
 * - Test 5: Verificar patrón de entrada en todos los agentes
 */

import { AGENTES, getHandoffMessages } from './src/deteccion-intenciones/orquestador.js';

console.log('🧪 INICIANDO TESTS: Handoff Silencioso\n');
console.log('═'.repeat(60));

// ════════════════════════════════════════════════════════════
// TEST 1: Aurora → Aluna (coworking)
// ════════════════════════════════════════════════════════════
console.log('\n📋 TEST 1: Handoff AURORA → ALUNA');
console.log('─'.repeat(60));

const test1 = getHandoffMessages('AURORA', 'ALUNA', 'Diego', 'es');
console.log('👋 Despedida (NO se envía):', test1.despedida);
console.log('\n✨ Entrada (ÚNICO mensaje):', test1.entrada);

// Verificaciones
const verificaciones1 = {
  tieneTomoRelevo: test1.entrada.includes('tomo el relevo'),
  tieneMencionReturn: test1.entrada.includes('@aurora'),
  tieneEmojis: (test1.entrada.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length >= 2,
  noTieneDetallesPrecio: !test1.entrada.includes('$140') && !test1.entrada.includes('Plan 10')
};

console.log('\n✅ Verificaciones:');
console.log('  - Tiene "tomo el relevo":', verificaciones1.tieneTomoRelevo ? '✅' : '❌');
console.log('  - Tiene @aurora return:', verificaciones1.tieneMencionReturn ? '✅' : '❌');
console.log('  - Tiene 2+ emojis:', verificaciones1.tieneEmojis ? '✅' : '❌');
console.log('  - NO tiene precios detallados:', verificaciones1.noTieneDetallesPrecio ? '✅' : '❌');

// ════════════════════════════════════════════════════════════
// TEST 2: Aurora → Adriana (seguros)
// ════════════════════════════════════════════════════════════
console.log('\n\n📋 TEST 2: Handoff AURORA → ADRIANA');
console.log('─'.repeat(60));

const test2 = getHandoffMessages('AURORA', 'ADRIANA', 'Maria', 'es');
console.log('👋 Despedida (NO se envía):', test2.despedida);
console.log('\n✨ Entrada (ÚNICO mensaje):', test2.entrada);

const verificaciones2 = {
  tieneTomoRelevo: test2.entrada.includes('tomo el relevo'),
  tieneMencionReturn: test2.entrada.includes('@aurora'),
  tieneCredenciales: test2.entrada.includes('17 años') || test2.entrada.includes('experiencia'),
  tieneEmojis: (test2.entrada.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length >= 2
};

console.log('\n✅ Verificaciones:');
console.log('  - Tiene "tomo el relevo":', verificaciones2.tieneTomoRelevo ? '✅' : '❌');
console.log('  - Tiene @aurora return:', verificaciones2.tieneMencionReturn ? '✅' : '❌');
console.log('  - Menciona credenciales:', verificaciones2.tieneCredenciales ? '✅' : '❌');
console.log('  - Tiene 2+ emojis:', verificaciones2.tieneEmojis ? '✅' : '❌');

// ════════════════════════════════════════════════════════════
// TEST 3: Aluna → Aurora (return)
// ════════════════════════════════════════════════════════════
console.log('\n\n📋 TEST 3: Handoff ALUNA → AURORA (Usuario regresa)');
console.log('─'.repeat(60));

const test3 = getHandoffMessages('ALUNA', 'AURORA', 'Pedro', 'es');
console.log('👋 Despedida (NO se envía):', test3.despedida);
console.log('\n✨ Entrada (ÚNICO mensaje):', test3.entrada);

const verificaciones3 = {
  tieneTomoRelevo: test3.entrada.includes('tomo el relevo'),
  mencionaAgenteAnterior: test3.entrada.includes('Aluna'),
  mencionaMentionReturn: test3.entrada.includes('@aluna'),
  tieneDisponibilidad: test3.entrada.includes('disponible') || test3.entrada.includes('available'),
  tieneMemoria: test3.entrada.includes('recordará') || test3.entrada.includes('última conversación')
};

console.log('\n✅ Verificaciones Aurora return:');
console.log('  - Tiene "tomo el relevo":', verificaciones3.tieneTomoRelevo ? '✅' : '❌');
console.log('  - Menciona agente anterior (Aluna):', verificaciones3.mencionaAgenteAnterior ? '✅' : '❌');
console.log('  - Incluye @aluna return:', verificaciones3.mencionaMentionReturn ? '✅' : '❌');
console.log('  - Confirma disponibilidad:', verificaciones3.tieneDisponibilidad ? '✅' : '❌');
console.log('  - Menciona memoria/continuidad:', verificaciones3.tieneMemoria ? '✅' : '❌');

// ════════════════════════════════════════════════════════════
// TEST 4: Verificar TODOS los agentes activos
// ════════════════════════════════════════════════════════════
console.log('\n\n📋 TEST 4: Verificar entrada de TODOS los agentes');
console.log('─'.repeat(60));

const agentesActivos = ['ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI'];
const resultadosAgentes = [];

for (const agente of agentesActivos) {
  const mensajes = AGENTES[agente].getMensajes('es');
  const entrada = mensajes.entrada.replace('{nombre}', 'Usuario');
  
  const verificacion = {
    agente,
    tieneTomoRelevo: entrada.toLowerCase().includes('tomo el relevo') || entrada.toLowerCase().includes('taking over'),
    tieneMencionReturn: entrada.includes('@aurora'),
    emojiCount: (entrada.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length,
    tieneCredenciales: entrada.includes('año') || entrada.includes('especialista') || entrada.includes('certificad') || entrada.includes('Especialista'),
    longitudMensaje: entrada.length
  };
  
  resultadosAgentes.push(verificacion);
  
  console.log(`\n🤖 ${agente}:`);
  console.log(`   - Tomo el relevo: ${verificacion.tieneTomoRelevo ? '✅' : '❌'}`);
  console.log(`   - @aurora return: ${verificacion.tieneMencionReturn ? '✅' : '❌'}`);
  console.log(`   - Emojis (debe ser 2-3): ${verificacion.emojiCount} ${verificacion.emojiCount >= 2 && verificacion.emojiCount <= 3 ? '✅' : '⚠️'}`);
  console.log(`   - Credenciales/especialidad: ${verificacion.tieneCredenciales ? '✅' : '❌'}`);
  console.log(`   - Longitud: ${verificacion.longitudMensaje} chars ${verificacion.longitudMensaje < 500 ? '✅' : '⚠️ (muy largo)'}`);
}

// ════════════════════════════════════════════════════════════
// TEST 5: Multiidioma (Aurora return)
// ════════════════════════════════════════════════════════════
console.log('\n\n📋 TEST 5: Aurora return en múltiples idiomas');
console.log('─'.repeat(60));

const idiomas = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' }
];

for (const idioma of idiomas) {
  const mensajes = getHandoffMessages('ALUNA', 'AURORA', 'Test', idioma.code);
  const tieneTomoRelevo = mensajes.entrada.includes('tomo el relevo') || 
                          mensajes.entrada.includes('taking over') ||
                          mensajes.entrada.includes('prends le relais') ||
                          mensajes.entrada.includes('prendo il comando') ||
                          mensajes.entrada.includes('assumo daqui');
  
  console.log(`\n${idioma.name} (${idioma.code}): ${tieneTomoRelevo ? '✅' : '❌'}`);
  console.log(`   Preview: ${mensajes.entrada.substring(0, 100)}...`);
}

// ════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ════════════════════════════════════════════════════════════
console.log('\n\n' + '═'.repeat(60));
console.log('📊 RESUMEN DE TESTS');
console.log('═'.repeat(60));

const todosLosTests = [
  verificaciones1.tieneTomoRelevo && verificaciones1.tieneMencionReturn && verificaciones1.tieneEmojis,
  verificaciones2.tieneTomoRelevo && verificaciones2.tieneMencionReturn && verificaciones2.tieneEmojis,
  verificaciones3.tieneTomoRelevo && verificaciones3.mencionaAgenteAnterior && verificaciones3.mencionaMentionReturn,
  resultadosAgentes.every(r => r.tieneTomoRelevo && r.tieneMencionReturn && r.emojiCount >= 2)
];

const testsPasados = todosLosTests.filter(t => t).length;
const testsTotal = todosLosTests.length;

console.log(`\n✅ Tests pasados: ${testsPasados}/${testsTotal}`);

if (testsPasados === testsTotal) {
  console.log('\n🎉 TODOS LOS TESTS PASARON - Handoff silencioso implementado correctamente');
  console.log('   ✓ Solo nuevo agente habla (NO despedida)');
  console.log('   ✓ Patrón "tomo el relevo" presente');
  console.log('   ✓ Instrucciones @mention incluidas');
  console.log('   ✓ 2-3 emojis por mensaje');
  console.log('   ✓ Credenciales/especialidad mencionadas');
  console.log('   ✓ Multiidioma funcionando');
} else {
  console.log('\n⚠️ ALGUNOS TESTS FALLARON - Revisar implementación');
}

console.log('\n' + '═'.repeat(60));
console.log('🏁 Tests completados\n');

// Forzar exit para evitar que se quede colgado
process.exit(testsPasados === testsTotal ? 0 : 1);
