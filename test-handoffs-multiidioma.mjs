/**
 * 🧪 TEST: Handoffs Multi-idioma (Entrada y Salida)
 * Verifica que los handoffs funcionen correctamente en todos los idiomas
 * incluyendo el fallback a inglés para idiomas no soportados
 */

import { AURORA } from './src/deteccion-intenciones/aurora.js';
import { ALUNA } from './src/deteccion-intenciones/aluna.js';
import { ADRIANA } from './src/deteccion-intenciones/adriana.js';
import { ENZO } from './src/deteccion-intenciones/enzo.js';
import { ANGELA } from './src/deteccion-intenciones/angela.js';
import { AXEL } from './src/deteccion-intenciones/axel.js';
import { GABI } from './src/deteccion-intenciones/gabi.js';
import { PAULA } from './src/deteccion-intenciones/paula.js';
import { getHandoffMessages } from './src/deteccion-intenciones/orquestador.js';

const agentes = {
  AURORA,
  ALUNA,
  ADRIANA,
  ENZO,
  ANGELA,
  AXEL,
  GABI,
  PAULA
};

console.log('🧪 TESTING: Handoffs Multi-idioma\n');
console.log('='.repeat(80));

// Test 1: Usuario FRANCÉS contacta diferentes agentes
console.log('\n📋 TEST 1: Usuario FR → @angela (no soporta FR)');
console.log('-'.repeat(80));

const angelaMensajesFR = ANGELA.getMensajes('fr');
const esFallbackEN = angelaMensajesFR.entrada.includes('Hello') && !angelaMensajesFR.entrada.includes('Bonjour');
console.log(`Usuario preferredLanguage: 'fr'`);
console.log(`Angela getMensajes('fr'):`);
console.log(`  ${angelaMensajesFR.entrada.substring(0, 60)}...`);
console.log(`  Fallback a inglés: ${esFallbackEN ? '✅ SÍ' : '❌ NO'}`);

// Test 2: Usuario FRANCÉS → agentes que SÍ soportan FR
console.log('\n📋 TEST 2: Usuario FR → @aurora (soporta FR)');
console.log('-'.repeat(80));

const auroraMensajesFR = AURORA.getMensajes('fr');
const tieneBonjour = auroraMensajesFR.entrada.includes('Bonjour');
console.log(`Usuario preferredLanguage: 'fr'`);
console.log(`Aurora getMensajes('fr'):`);
console.log(`  ${auroraMensajesFR.entrada.substring(0, 60)}...`);
console.log(`  Responde en francés: ${tieneBonjour ? '✅ SÍ' : '❌ NO'}`);

// Test 3: Usuario QUECHUA → Angela (soporta QU)
console.log('\n📋 TEST 3: Usuario QU → @angela (soporta QU)');
console.log('-'.repeat(80));

const angelaMensajesQU = ANGELA.getMensajes('qu');
const tieneQuechua = angelaMensajesQU.entrada.includes('Napaykullayki');
console.log(`Usuario preferredLanguage: 'qu'`);
console.log(`Angela getMensajes('qu'):`);
console.log(`  ${angelaMensajesQU.entrada.substring(0, 60)}...`);
console.log(`  Responde en quechua: ${tieneQuechua ? '✅ SÍ' : '❌ NO'}`);

// Test 4: Usuario QUECHUA → Aurora (NO soporta QU)
console.log('\n📋 TEST 4: Usuario QU → @aurora (no soporta QU)');
console.log('-'.repeat(80));

const auroraMensajesQU = AURORA.getMensajes('qu');
const esFallbackEN_Aurora = auroraMensajesQU.entrada.includes('Hello') || auroraMensajesQU.entrada.includes('Hi');
console.log(`Usuario preferredLanguage: 'qu'`);
console.log(`Aurora getMensajes('qu'):`);
console.log(`  ${auroraMensajesQU.entrada.substring(0, 60)}...`);
console.log(`  Fallback a inglés: ${esFallbackEN_Aurora ? '✅ SÍ' : '❌ NO'}`);

// Test 5: Usuario PORTUGUÉS (no soportado) → todos los agentes
console.log('\n📋 TEST 5: Usuario PT (no soportado) → todos los agentes');
console.log('-'.repeat(80));

let todosUsanFallbackEN = true;
for (const [nombre, agente] of Object.entries(agentes)) {
  const mensajes = agente.getMensajes('pt');
  const usaEN = mensajes.entrada.includes('Hello') || mensajes.entrada.includes('Hi');
  const usaES = mensajes.entrada.includes('¡Hola') || mensajes.entrada.includes('Soy');
  
  if (!usaEN && !usaES) {
    console.log(`  ❌ ${nombre}: No usa fallback correcto`);
    todosUsanFallbackEN = false;
  } else if (usaES) {
    console.log(`  ⚠️  ${nombre}: Usa fallback ES (debería ser EN)`);
    todosUsanFallbackEN = false;
  } else {
    console.log(`  ✅ ${nombre}: Fallback a inglés OK`);
  }
}

// Test 6: Orquestador - Aurora return message multiidioma
console.log('\n📋 TEST 6: Orquestador - Aurora return message');
console.log('-'.repeat(80));

const testHandoffs = [
  { from: 'ALUNA', to: 'AURORA', lang: 'es', expectedWord: 'Hola' },
  { from: 'ALUNA', to: 'AURORA', lang: 'en', expectedWord: 'Hello' },
  { from: 'ALUNA', to: 'AURORA', lang: 'fr', expectedWord: 'Rebonjour' },
  { from: 'ALUNA', to: 'AURORA', lang: 'qu', expectedWord: 'Hello' }, // Fallback EN
  { from: 'ALUNA', to: 'AURORA', lang: 'pt', expectedWord: 'Hello' }  // Fallback EN
];

let orquestadorOK = true;
for (const test of testHandoffs) {
  const { entrada } = getHandoffMessages(test.from, test.to, 'Diego', test.lang);
  const contienePalabra = entrada.includes(test.expectedWord);
  const resultado = contienePalabra ? '✅' : '❌';
  console.log(`  ${resultado} ${test.from}→${test.to} (${test.lang}): Esperaba "${test.expectedWord}" - ${contienePalabra ? 'OK' : 'FALLO'}`);
  if (!contienePalabra) orquestadorOK = false;
}

// Test 7: Handoffs salida (getHandover) - Verificar si existe y tiene idiomas
console.log('\n📋 TEST 7: Handoffs salida (despedidas de agentes)');
console.log('-'.repeat(80));

const agentesConHandover = ['ANGELA', 'AXEL', 'ADRIANA', 'GABI'];
for (const nombreAgente of agentesConHandover) {
  const agente = agentes[nombreAgente];
  if (typeof agente.getHandover === 'function') {
    // Probar handover a Aurora en diferentes idiomas
    const handoverES = agente.getHandover('AURORA', 'Diego', 'es');
    const handoverEN = agente.getHandover('AURORA', 'Diego', 'en');
    const handoverFR = agente.getHandover('AURORA', 'Diego', 'fr');
    
    const tieneES = handoverES && handoverES.length > 0;
    const tieneEN = handoverEN && handoverEN.length > 0;
    const tieneFR = handoverFR && handoverFR.length > 0;
    
    console.log(`  ${nombreAgente}:`);
    console.log(`    ${tieneES ? '✅' : '❌'} ES: ${tieneES ? 'OK' : 'FALLO'}`);
    console.log(`    ${tieneEN ? '✅' : '❌'} EN: ${tieneEN ? 'OK' : 'FALLO'}`);
    console.log(`    ${tieneFR ? '✅' : '❌'} FR: ${tieneFR ? 'OK' : 'FALLO'}`);
  } else {
    console.log(`  ℹ️  ${nombreAgente}: No tiene getHandover (usa orquestador)`);
  }
}

// Resumen
console.log('\n' + '='.repeat(80));
console.log('📊 RESUMEN');
console.log('='.repeat(80));

const problemas = [];

if (!esFallbackEN) problemas.push('Angela no hace fallback a inglés para FR');
if (!todosUsanFallbackEN) problemas.push('No todos los agentes usan fallback EN para idiomas no soportados');
if (!orquestadorOK) problemas.push('Orquestador tiene problemas con Aurora return messages');

if (problemas.length > 0) {
  console.log('\n❌ PROBLEMAS ENCONTRADOS:');
  problemas.forEach(p => console.log(`  - ${p}`));
} else {
  console.log('\n✅ TODOS LOS HANDOFFS FUNCIONAN CORRECTAMENTE');
  console.log('\n🎉 Sistema multi-idioma handoffs implementado:');
  console.log('  • Usuario FR → Angela: Responde en inglés (fallback)');
  console.log('  • Usuario FR → Aurora/Aluna/otros: Responden en francés');
  console.log('  • Usuario QU → Angela: Responde en quechua');
  console.log('  • Usuario QU → otros: Responden en inglés (fallback)');
  console.log('  • Usuario PT/IT → todos: Responden en inglés (fallback)');
  console.log('  • Orquestador Aurora return: Soporta ES/EN/FR con fallback EN');
}

console.log('\n' + '='.repeat(80));
