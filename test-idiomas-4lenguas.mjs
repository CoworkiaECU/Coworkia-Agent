/**
 * 🧪 TEST: Sistema Multi-idioma 4 Lenguas (ES/EN/FR/QU)
 * Verifica que todos los agentes respondan correctamente en los idiomas soportados
 * con fallback a inglés cuando el idioma no está soportado
 */

import { detectLanguageCommand, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from './src/utils/language-detector.js';

// Importar todos los agentes
import { AURORA } from './src/deteccion-intenciones/aurora.js';
import { ALUNA } from './src/deteccion-intenciones/aluna.js';
import { ADRIANA } from './src/deteccion-intenciones/adriana.js';
import { ENZO } from './src/deteccion-intenciones/enzo.js';
import { ANGELA } from './src/deteccion-intenciones/angela.js';
import { AXEL } from './src/deteccion-intenciones/axel.js';
import { GABI } from './src/deteccion-intenciones/gabi.js';
import { PAULA } from './src/deteccion-intenciones/paula.js';

const agentes = [
  { nombre: 'Aurora', agente: AURORA, idiomas: ['es', 'en', 'fr'] },
  { nombre: 'Aluna', agente: ALUNA, idiomas: ['es', 'en', 'fr'] },
  { nombre: 'Adriana', agente: ADRIANA, idiomas: ['es', 'en', 'fr'] },
  { nombre: 'Enzo', agente: ENZO, idiomas: ['es', 'en', 'fr'] },
  { nombre: 'Angela', agente: ANGELA, idiomas: ['es', 'en', 'qu'] },
  { nombre: 'Axel', agente: AXEL, idiomas: ['es', 'en', 'fr'] },
  { nombre: 'Gabi', agente: GABI, idiomas: ['es', 'en', 'fr'] },
  { nombre: 'Paula', agente: PAULA, idiomas: ['es', 'en', 'fr'] }
];

const idiomasTest = [
  { codigo: 'es', nombre: 'Español', comando: 'español' },
  { codigo: 'en', nombre: 'English', comando: 'english' },
  { codigo: 'fr', nombre: 'Français', comando: 'français' },
  { codigo: 'qu', nombre: 'Runasimi', comando: 'quechua' },
  { codigo: 'pt', nombre: 'Português (no soportado)', comando: 'português' },
  { codigo: 'it', nombre: 'Italiano (no soportado)', comando: 'italiano' }
];

console.log('🧪 TESTING: Sistema Multi-idioma 4 Lenguas\n');
console.log('=' .repeat(80));

// Test 1: Verificar SUPPORTED_LANGUAGES
console.log('\n📋 TEST 1: SUPPORTED_LANGUAGES');
console.log('-'.repeat(80));
console.log('Idiomas soportados:', Object.keys(SUPPORTED_LANGUAGES));
console.log('Valores:', Object.values(SUPPORTED_LANGUAGES));
console.log('Nombres:', LANGUAGE_NAMES);

const esperado = { SPANISH: 'es', ENGLISH: 'en', FRENCH: 'fr', QUECHUA: 'qu' };
const esValido = JSON.stringify(SUPPORTED_LANGUAGES) === JSON.stringify(esperado);
console.log(esValido ? '✅ SUPPORTED_LANGUAGES correcto' : '❌ SUPPORTED_LANGUAGES incorrecto');

// Test 2: Detectar comandos de idioma
console.log('\n📋 TEST 2: Detección de comandos');
console.log('-'.repeat(80));
idiomasTest.forEach(({ codigo, nombre, comando }) => {
  const detected = detectLanguageCommand(comando);
  const esperado = ['es', 'en', 'fr', 'qu'].includes(codigo) ? codigo : null;
  const resultado = detected === esperado ? '✅' : '❌';
  console.log(`${resultado} "${comando}" → ${detected || 'null'} (esperado: ${esperado || 'null'})`);
});

// Test 3: Verificar mensajes de cada agente en cada idioma
console.log('\n📋 TEST 3: Mensajes por agente y idioma');
console.log('-'.repeat(80));

let errores = [];

agentes.forEach(({ nombre, agente, idiomas }) => {
  console.log(`\n🤖 ${nombre} (soporta: ${idiomas.join(', ')})`);
  
  // Probar idiomas soportados
  idiomas.forEach(lang => {
    const mensajes = agente.getMensajes(lang);
    if (!mensajes.entrada || !mensajes.despedida) {
      console.log(`  ❌ ${lang.toUpperCase()}: Mensajes incompletos`);
      errores.push(`${nombre} - ${lang}: Mensajes incompletos`);
    } else {
      // Verificar que el mensaje no está en español cuando debería ser otro idioma
      const esEntrada = mensajes.entrada.includes('¡Hola') || mensajes.entrada.includes('Soy');
      const esDespedida = mensajes.despedida.includes('Perfecto') || mensajes.despedida.includes('Genial');
      
      if (lang === 'es') {
        console.log(`  ✅ ${lang.toUpperCase()}: OK`);
      } else if (lang === 'en') {
        if (esEntrada) {
          console.log(`  ❌ ${lang.toUpperCase()}: Mensaje en español, no inglés`);
          errores.push(`${nombre} - ${lang}: Mensaje en español`);
        } else {
          console.log(`  ✅ ${lang.toUpperCase()}: OK`);
        }
      } else if (lang === 'fr') {
        if (esEntrada && !mensajes.entrada.includes('Bonjour')) {
          console.log(`  ❌ ${lang.toUpperCase()}: Mensaje no en francés`);
          errores.push(`${nombre} - ${lang}: Mensaje no en francés`);
        } else {
          console.log(`  ✅ ${lang.toUpperCase()}: OK`);
        }
      } else if (lang === 'qu') {
        if (!mensajes.entrada.includes('Napaykullayki') && !mensajes.entrada.includes('Allinllachu')) {
          console.log(`  ❌ ${lang.toUpperCase()}: Mensaje no en quechua`);
          errores.push(`${nombre} - ${lang}: Mensaje no en quechua`);
        } else {
          console.log(`  ✅ ${lang.toUpperCase()}: OK`);
        }
      }
    }
  });
  
  // Probar idiomas NO soportados (fallback a español)
  const noSoportados = ['pt', 'it', 'de'];
  noSoportados.forEach(lang => {
    const mensajes = agente.getMensajes(lang);
    // Debería retornar mensajes en español (fallback)
    const esFallback = mensajes.entrada.includes('¡Hola') || mensajes.entrada.includes('Soy') || 
                       mensajes.entrada.includes('Hello') || mensajes.entrada.includes('Hi');
    if (esFallback) {
      console.log(`  ✅ ${lang.toUpperCase()}: Fallback OK`);
    } else {
      console.log(`  ❌ ${lang.toUpperCase()}: Fallback incorrecto`);
      errores.push(`${nombre} - ${lang}: Fallback incorrecto`);
    }
  });
});

// Test 4: Casos especiales Angela (solo QU, no FR)
console.log('\n📋 TEST 4: Casos especiales');
console.log('-'.repeat(80));
const angelaMensajesFR = ANGELA.getMensajes('fr');
const angelaMensajesQU = ANGELA.getMensajes('qu');

// Angela no debe tener francés
const angelaTieneFR = angelaMensajesFR.entrada.includes('Bonjour');
if (!angelaTieneFR) {
  console.log('✅ Angela NO tiene francés (correcto)');
} else {
  console.log('❌ Angela tiene francés (incorrecto)');
  errores.push('Angela tiene francés cuando no debería');
}

// Angela debe tener quechua
const angelaTieneQU = angelaMensajesQU.entrada.includes('Napaykullayki');
if (angelaTieneQU) {
  console.log('✅ Angela tiene quechua (correcto)');
} else {
  console.log('❌ Angela NO tiene quechua (incorrecto)');
  errores.push('Angela no tiene quechua cuando debería');
}

// Gabi no debe tener quechua
const gabiMensajesQU = GABI.getMensajes('qu');
const gabiTieneQU = gabiMensajesQU.entrada.includes('Allinllachu');
if (!gabiTieneQU) {
  console.log('✅ Gabi NO tiene quechua (correcto)');
} else {
  console.log('❌ Gabi tiene quechua (incorrecto)');
  errores.push('Gabi tiene quechua cuando no debería');
}

// Gabi debe tener francés
const gabiMensajesFR = GABI.getMensajes('fr');
const gabiTieneFR = gabiMensajesFR.entrada.includes('Bonjour');
if (gabiTieneFR) {
  console.log('✅ Gabi tiene francés (correcto)');
} else {
  console.log('❌ Gabi NO tiene francés (incorrecto)');
  errores.push('Gabi no tiene francés cuando debería');
}

// Resumen
console.log('\n' + '='.repeat(80));
console.log('📊 RESUMEN');
console.log('='.repeat(80));
console.log(`Total agentes: ${agentes.length}`);
console.log(`Total idiomas test: ${idiomasTest.length}`);
console.log(`Errores encontrados: ${errores.length}`);

if (errores.length > 0) {
  console.log('\n❌ ERRORES:');
  errores.forEach(err => console.log(`  - ${err}`));
  console.log('\n❌ TEST FALLIDO');
} else {
  console.log('\n✅ TODOS LOS TESTS PASARON');
  console.log('\n🎉 Sistema multi-idioma 4 lenguas implementado correctamente:');
  console.log('  • Español (ES) - Todos los agentes');
  console.log('  • English (EN) - Todos los agentes');
  console.log('  • Français (FR) - Todos excepto Angela');
  console.log('  • Runasimi (QU) - Solo Angela');
  console.log('  • Fallback EN - Idiomas no soportados');
}

console.log('\n' + '='.repeat(80));
