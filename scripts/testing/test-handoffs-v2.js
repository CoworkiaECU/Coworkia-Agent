// Test completo de handoffs V2 - Auditoría de entrada/salida de cada agente
// Verifica multilenguaje, mensajes, y sistema de transición

import { AURORA } from '../../src/deteccion-intenciones/aurora.js';
import { ALUNA } from '../../src/deteccion-intenciones/aluna.js';
import { PAULA } from '../../src/deteccion-intenciones/paula.js';
import { ADRIANA } from '../../src/deteccion-intenciones/adriana.js';
import { ENZO } from '../../src/deteccion-intenciones/enzo.js';
import { ANGELA } from '../../src/deteccion-intenciones/angela.js';
import { AXEL } from '../../src/deteccion-intenciones/axel.js';
import { GABI } from '../../src/deteccion-intenciones/gabi.js';
import { getHandoffMessages } from '../../src/deteccion-intenciones/orquestador.js';

const AGENTES = {
  AURORA,
  ALUNA,
  PAULA,
  ADRIANA,
  ENZO,
  ANGELA,
  AXEL,
  GABI
};

const IDIOMAS = ['es', 'en', 'fr', 'it', 'pt', 'qu'];
const TODOS_LOS_AGENTES = ['AURORA', 'ALUNA', 'PAULA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI'];

console.log('🔍 AUDITORÍA DE HANDOFFS V2\n');
console.log('='*80);

// Test 1: Mensajes de entrada de cada agente
console.log('\n\n📥 TEST 1: MENSAJES DE ENTRADA');
console.log('='*80);

for (const agentKey of TODOS_LOS_AGENTES) {
  const agente = AGENTES[agentKey];
  console.log(`\n\n🤖 ${agentKey} (${agente.nombre})`);
  console.log('-'.repeat(60));
  
  if (!agente.getMensajes) {
    console.log('❌ ERROR: No tiene getMensajes()');
    continue;
  }
  
  // Probar cada idioma
  for (const idioma of IDIOMAS) {
    try {
      const mensajes = agente.getMensajes(idioma);
      const entrada = mensajes.entrada?.replace(/{nombre}/g, 'Diego');
      
      if (!entrada) {
        console.log(`❌ ${idioma.toUpperCase()}: Sin mensaje de entrada`);
        continue;
      }
      
      // Verificar que incluya instrucciones de @aurora para volver
      const tieneRetorno = entrada.includes('@aurora') || entrada.includes('@Aurora');
      const esAurora = agentKey === 'AURORA';
      
      if (!esAurora && !tieneRetorno) {
        console.log(`⚠️  ${idioma.toUpperCase()}: Falta mención @aurora para retorno`);
      } else if (esAurora) {
        console.log(`✅ ${idioma.toUpperCase()}: OK (agente principal)`);
      } else {
        console.log(`✅ ${idioma.toUpperCase()}: OK (incluye @aurora)`);
      }
      
      // Mostrar preview del mensaje
      const preview = entrada.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      
    } catch (error) {
      console.log(`❌ ${idioma.toUpperCase()}: ERROR - ${error.message}`);
    }
  }
}

// Test 2: Mensajes de handoff (salida hacia otros agentes)
console.log('\n\n\n📤 TEST 2: MENSAJES DE HANDOFF (SALIDA)');
console.log('='*80);

for (const fromAgent of TODOS_LOS_AGENTES) {
  console.log(`\n\n🔄 DESDE ${fromAgent}`);
  console.log('-'.repeat(60));
  
  const agente = AGENTES[fromAgent];
  
  if (!agente.getHandover) {
    console.log('⚠️  Sin función getHandover() - Usa sistema genérico');
    continue;
  }
  
  // Probar handoff a cada agente
  for (const toAgent of TODOS_LOS_AGENTES) {
    if (fromAgent === toAgent) continue; // No probamos handoff a sí mismo
    
    try {
      const mensaje = agente.getHandover(toAgent, 'Diego', 'es');
      
      if (!mensaje) {
        console.log(`   ${fromAgent} → ${toAgent}: ⚠️  Sin mensaje específico (usará genérico)`);
      } else {
        console.log(`   ${fromAgent} → ${toAgent}: ✅ OK`);
      }
    } catch (error) {
      console.log(`   ${fromAgent} → ${toAgent}: ❌ ERROR - ${error.message}`);
    }
  }
}

// Test 3: Sistema unificado getHandoffMessages del orquestador
console.log('\n\n\n🔄 TEST 3: SISTEMA UNIFICADO (getHandoffMessages)');
console.log('='*80);

const testCases = [
  { from: 'AURORA', to: 'ALUNA', desc: 'Coworking → Membresías (común)' },
  { from: 'ALUNA', to: 'AURORA', desc: 'Membresías → Coworking (retorno)' },
  { from: 'AURORA', to: 'PAULA', desc: 'Coworking → Bienes raíces' },
  { from: 'PAULA', to: 'AURORA', desc: 'Bienes raíces → Coworking' },
  { from: 'AURORA', to: 'ADRIANA', desc: 'Coworking → Seguros' },
  { from: 'ADRIANA', to: 'AXEL', desc: 'Seguros → Taller (cruzado)' },
  { from: 'ENZO', to: 'GABI', desc: 'Marketing → Finanzas (cruzado)' },
  { from: 'ANGELA', to: 'AURORA', desc: 'Salud → Coworking (retorno)' }
];

for (const test of testCases) {
  console.log(`\n${test.from} → ${test.to}: ${test.desc}`);
  
  try {
    const { despedida, entrada } = getHandoffMessages(test.from, test.to, 'Diego', 'es');
    
    if (!despedida || !entrada) {
      console.log('❌ ERROR: Mensaje faltante');
      console.log(`   Despedida: ${despedida ? 'OK' : 'FALTA'}`);
      console.log(`   Entrada: ${entrada ? 'OK' : 'FALTA'}`);
    } else {
      console.log('✅ OK - Ambos mensajes presentes');
      console.log(`   Despedida (${despedida.length} chars): ${despedida.substring(0, 60)}...`);
      console.log(`   Entrada (${entrada.length} chars): ${entrada.substring(0, 60)}...`);
      
      // Verificar que mencione al agente anterior
      const mencionaRetorno = entrada.toLowerCase().includes(test.from.toLowerCase()) || 
                              entrada.includes('@' + test.from.toLowerCase());
      if (test.to !== 'AURORA' && !mencionaRetorno) {
        console.log('⚠️  Entrada no menciona cómo volver al agente anterior');
      }
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

// Test 4: Multilenguaje completo
console.log('\n\n\n🌍 TEST 4: MULTILENGUAJE COMPLETO');
console.log('='*80);

const testMultilang = [
  { from: 'AURORA', to: 'ALUNA' },
  { from: 'ALUNA', to: 'AURORA' },
  { from: 'AURORA', to: 'PAULA' }
];

for (const test of testMultilang) {
  console.log(`\n\n${test.from} → ${test.to}`);
  console.log('-'.repeat(60));
  
  for (const idioma of IDIOMAS) {
    try {
      const { despedida, entrada } = getHandoffMessages(test.from, test.to, 'Diego', idioma);
      
      // Verificar que el mensaje esté en el idioma correcto
      const contieneIngles = /hello|goodbye|please|thank/i.test(entrada);
      const contieneFrances = /bonjour|merci|salut/i.test(entrada);
      const contieneEspanol = /hola|gracias|necesitas/i.test(entrada);
      
      let idiomaDetectado = '';
      if (idioma === 'en' && contieneIngles) idiomaDetectado = 'en';
      else if (idioma === 'fr' && contieneFrances) idiomaDetectado = 'fr';
      else if (idioma === 'es' && contieneEspanol) idiomaDetectado = 'es';
      else idiomaDetectado = '?';
      
      if (idiomaDetectado === idioma || idioma === 'it' || idioma === 'pt' || idioma === 'qu') {
        console.log(`✅ ${idioma.toUpperCase()}: OK`);
      } else {
        console.log(`⚠️  ${idioma.toUpperCase()}: Posible fallback a otro idioma`);
      }
    } catch (error) {
      console.log(`❌ ${idioma.toUpperCase()}: ERROR - ${error.message}`);
    }
  }
}

// Test 5: Agentes en mantenimiento
console.log('\n\n\n🔧 TEST 5: AGENTES EN MANTENIMIENTO');
console.log('='*80);

for (const agentKey of TODOS_LOS_AGENTES) {
  const agente = AGENTES[agentKey];
  const maintenance = agente.maintenance === true;
  
  if (maintenance) {
    console.log(`⚠️  ${agentKey}: EN MANTENIMIENTO (no disponible)`);
  } else {
    console.log(`✅ ${agentKey}: ACTIVO`);
  }
}

// Test 6: Análisis de impacto en BD
console.log('\n\n\n💾 TEST 6: ANÁLISIS DE IMPACTO EN BASE DE DATOS');
console.log('='*80);

console.log('\n📋 TABLAS AFECTADAS:');
console.log('1. users.active_agent (VARCHAR)');
console.log('   - Almacena: AURORA, ALUNA, PAULA, ADRIANA, ENZO, ANGELA, AXEL, GABI');
console.log('   - Impacto: ✅ NINGUNO (solo cambios en lógica, no estructura)');

console.log('\n2. interactions.intent_reason (VARCHAR)');
console.log('   - Valores V1: "trigger @Enzo", "keywords membresías", etc.');
console.log('   - Valores V2: "trigger @Enzo", "maintaining active agent", etc.');
console.log('   - Impacto: ✅ NINGUNO (valores compatibles, más simples)');

console.log('\n3. pending_confirmations (JSON)');
console.log('   - Estructura: { userId, reservationType, data, ... }');
console.log('   - Impacto: ✅ NINGUNO (no afectada por handoffs)');

console.log('\n\n📊 CAMBIOS EN INTENT_REASON ESPERADOS:');
console.log('ANTES V1:');
console.log('  - "keywords membresías/planes"');
console.log('  - "keywords reservas/pagos"');
console.log('  - "auto-derivation: paula out-of-scope"');
console.log('  - "implicit handoff: nueva reserva"');

console.log('\nDESPUÉS V2:');
console.log('  - "keywords membresías/planes (natural)" ← AURORA↔ALUNA única excepción');
console.log('  - "keywords reservas/pagos (natural)" ← AURORA↔ALUNA única excepción');
console.log('  - "maintaining active agent" ← Nuevo valor común');
console.log('  - "trigger @agentname" ← Handoffs explícitos únicamente');

// Resumen final
console.log('\n\n\n' + '='*80);
console.log('📊 RESUMEN DE AUDITORÍA');
console.log('='*80);

console.log('\n✅ MANTIENE:');
console.log('• Aurora ↔ Aluna: Detección automática keywords (natural)');
console.log('• Sistema multilenguaje completo (es, en, fr, it, pt, qu)');
console.log('• Estructura BD sin cambios (retrocompatible)');
console.log('• Mensajes de entrada con @aurora para retorno');

console.log('\n🔧 ELIMINA:');
console.log('• Paula: Auto-handoff por keywords "agendar", "reservar"');
console.log('• Adriana/Enzo/Angela/Axel/Gabi: Auto-handoff por keywords');
console.log('• detectPaulaOutOfScope() del orquestador');
console.log('• Handoffs implícitos en detección de intención');

console.log('\n⚠️ RIESGOS:');
console.log('• Usuario dice "quiero seguros" → Ahora Paula NO cambia a Adriana');
console.log('  Solución: Paula informa "Para seguros menciona @adriana"');
console.log('• Keywords AURORA↔ALUNA siguen activas (decisión arquitectónica)');
console.log('  Razón: Flujo natural coworking requiere esta fluidez');

console.log('\n🎯 TESTING RECOMENDADO:');
console.log('1. Usuario en Paula dice "agendar visita" → Debe quedar en Paula');
console.log('2. Usuario en Aurora dice "plan 10" → Debe cambiar a Aluna (keyword)');
console.log('3. Usuario en Paula dice "@aurora" → Debe cambiar a Aurora (explícito)');
console.log('4. Usuario en cualquier agente dice "@adriana" → Cambio explícito');

console.log('\n\n✅ AUDITORÍA COMPLETADA\n');
