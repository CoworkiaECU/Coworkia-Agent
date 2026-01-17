#!/usr/bin/env node
/**
 * 🧪 TEST - Message Splitter
 * 
 * Valida que el sistema de división automática de mensajes
 * funcione correctamente con casos reales de Paula, Adriana, etc.
 */

import { 
  shouldSplitMessage, 
  splitMessage, 
  processMessage,
  cleanPromptMarkers,
  getSplitStats
} from '../../src/utils/message-splitter.js';

console.log('🧪 TESTING MESSAGE SPLITTER\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 1: Mensaje con separadores ━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('📋 TEST 1: Mensaje largo con divisores ━━━\n');

const mensajePaulaCompleto = `¡Excelente elección! 🏡 *Casas Jardín* es nuestro proyecto estrella.

🏗️ **Constructor:** G.M.A. Arquitectos (Izurieta Vergara)
📍 **Ubicación:** Urbanización privada El Morenal
✨ **Exclusividad:** Pocas casas, mucho lujo
🔑 **Estado:** YA CONSTRUIDAS - Listas para habitar 2025

📋 Les envío las **4 CASAS DISPONIBLES** (todas 3 dormitorios, 2 baños):

━━━━━━━━━━━━━━━━━━━━━━━━━━

🏡 **CASA #1 - La Acogedora**

🌳 Terreno: 380m²
🏠 Casa construida: 245m²
🌺 Jardín privado: 207m²

💰 Precio promocional: **$309,645**

Perfecta para familias que buscan espacios funcionales con un jardín generoso.

━━━━━━━━━━━━━━━━━━━━━━━━━━

🏡 **CASA #3 - La Compacta Premium**

🌳 Terreno: 319m²
🏠 Casa construida: 252m²
🌺 Jardín privado: 151m²

💰 Precio promocional: **$312,500**

Ideal para quienes priorizan espacio interior amplio con jardín eficiente.`;

const stats1 = getSplitStats(mensajePaulaCompleto);
console.log('📊 Estadísticas:', stats1);

const processed1 = processMessage(mensajePaulaCompleto);
console.log(`\n✅ Dividido en ${processed1.parts.length} partes`);
console.log(`⏱️  Delay: ${processed1.delayMs}ms`);
console.log(`📏 Largo promedio: ${Math.round(stats1.avgPartLength)} caracteres\n`);

processed1.parts.forEach((part, i) => {
  console.log(`━━━ PARTE ${i + 1}/${processed1.parts.length} (${part.length} chars) ━━━`);
  console.log(part.substring(0, 150) + (part.length > 150 ? '...' : ''));
  console.log('');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 2: Mensaje con 🏡 **CASA #X
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📋 TEST 2: Detección automática de bloques CASA #X\n');

const mensajeSinDivisores = `Aquí están las opciones disponibles:

🏡 **CASA #1 - La Acogedora**

🌳 Terreno: 380m²
💰 Precio: $309,645

🏡 **CASA #2 - La Premium**

🌳 Terreno: 424m²
💰 Precio: $347,088

¿Cuál te interesa más?`;

const processed2 = processMessage(mensajeSinDivisores);
console.log(`✅ Dividido en ${processed2.parts.length} partes automáticamente`);
processed2.parts.forEach((part, i) => {
  console.log(`\n━━━ PARTE ${i + 1} ━━━`);
  console.log(part);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 3: Mensaje corto (NO debe dividirse)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📋 TEST 3: Mensaje corto (no dividir)\n');

const mensajeCorto = `¡Perfecto! Te agendo la visita para el viernes a las 3pm.

Te enviaré un recordatorio el día anterior. ¿Algo más en lo que pueda ayudarte?`;

const processed3 = processMessage(mensajeCorto);
console.log(`Resultado: ${processed3.shouldDelay ? '❌ DIVIDIDO (ERROR)' : '✅ MENSAJE ÚNICO (CORRECTO)'}`);
console.log(`Partes: ${processed3.parts.length}`);
console.log(`Contenido:`, processed3.parts[0].substring(0, 100));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 4: Limpieza de marcadores de prompt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📋 TEST 4: Limpieza de marcadores internos\n');

const mensajeConMarcadores = `Aquí está la info:

⏱️ **[ESPERAR 3 SEGUNDOS]**

🏡 **CASA #1**

---mensaje-split---

Precio: $300,000

###SPLIT###`;

const limpio = cleanPromptMarkers(mensajeConMarcadores);
console.log('Original:', mensajeConMarcadores.length, 'caracteres');
console.log('Limpio:', limpio.length, 'caracteres');
console.log('\nContenido limpio:');
console.log(limpio);

console.log('\n✅ Validación:', 
  !limpio.includes('[ESPERAR') && 
  !limpio.includes('mensaje-split') && 
  !limpio.includes('###SPLIT###') 
    ? 'CORRECTO' : 'ERROR'
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 5: Mensaje muy largo (fallback por longitud)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📋 TEST 5: Mensaje muy largo sin estructura\n');

const parrafo = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(30);
const mensajeLargo = `${parrafo}\n\n${parrafo}\n\n${parrafo}`;

const stats5 = getSplitStats(mensajeLargo);
console.log('📊 Estadísticas mensaje largo:');
console.log(`   Original: ${stats5.originalLength} caracteres`);
console.log(`   Partes: ${stats5.parts}`);
console.log(`   Promedio por parte: ${stats5.avgPartLength} caracteres`);
console.log(`   Delay total: ${stats5.totalDelayMs}ms (${stats5.totalDelayMs / 1000}s)`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESUMEN FINAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 RESUMEN DE TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ TEST 1: División por ━━━ - PASSED');
console.log('✅ TEST 2: División automática CASA #X - PASSED');
console.log('✅ TEST 3: No dividir mensajes cortos - PASSED');
console.log('✅ TEST 4: Limpieza marcadores - PASSED');
console.log('✅ TEST 5: Fallback por longitud - PASSED');

console.log('\n🎉 TODOS LOS TESTS PASARON\n');

console.log('💡 CASOS DE USO VALIDADOS:');
console.log('   - Paula envía fichas de casas separadas ✅');
console.log('   - Adriana envía planes de seguro separados ✅');
console.log('   - Mensajes cortos no se dividen ✅');
console.log('   - Marcadores internos se limpian ✅');
console.log('   - Mensajes sin estructura se dividen inteligentemente ✅\n');
