#!/usr/bin/env node
/**
 * 🧪 TEST LOCAL: 3 Prompts de Campaña Aurora
 * Valida que los prompts se muestren correctamente
 */

import { AURORA } from './src/deteccion-intenciones/aurora.js';

console.log('🧪 TESTING: 3 PROMPTS DE CAMPAÑA AURORA\n');
console.log('=' .repeat(80));

// Simular perfil de usuario
const userProfile = {
  name: 'Diego',
  preferredLanguage: 'es',
  freeTrialUsed: false
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST #1: Campaña "Hola Coworkia! quiero probar el servicio"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📣 CAMPAÑA #1: "¡Hola Coworkia! quiero probar el servicio"\n');
console.log('Trigger: "quiero probar el servicio"');
console.log('\nSystem Prompt incluye:');

const prompt1 = AURORA.getSystemPrompt(false, 'es', 1, 'SERVICE_INTEREST_GREETING');
const campaignSection1 = prompt1.match(/PROMPT CAMPAÑA #1:.*?━━━━━━━━━━━━/s);

if (campaignSection1) {
  // Extraer la respuesta esperada
  const responseMatch = prompt1.match(/¡Hola {nombre}!.*?¿Qué día y hora prefieres\? 📅"/s);
  if (responseMatch) {
    const response = responseMatch[0].replace(/{nombre}/g, 'Diego');
    console.log('✅ RESPUESTA ESPERADA:');
    console.log('-'.repeat(80));
    console.log(response);
    console.log('-'.repeat(80));
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST #2: Campaña "Agente Virtual para mi empresa"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📣 CAMPAÑA #2: "Aurora, ¿qué puede hacer un Agente Virtual?"\n');
console.log('Trigger: "agente virtual para mi empresa"');

const prompt2 = AURORA.getSystemPrompt(false, 'es', 1, null);
const campaignSection2 = prompt2.match(/PROMPT CAMPAÑA #2:.*?REGLAS PARA ESTE FLUJO:/s);

if (campaignSection2) {
  const responseMatch = prompt2.match(/RESPONDE \(mensaje único condensado\):.*?Habla con @enzo para cotización personalizada 🚀/s);
  if (responseMatch) {
    const response = responseMatch[0]
      .replace('RESPONDE (mensaje único condensado):', '')
      .replace(/{nombre}/g, 'Diego')
      .trim();
    console.log('\n✅ RESPUESTA ESPERADA:');
    console.log('-'.repeat(80));
    console.log(response);
    console.log('-'.repeat(80));
    
    // Validar que incluya los 8 agentes
    const agents = ['@aurora', '@enzo', '@aluna', '@paula', '@axel', '@angela', '@adriana', '@gabi'];
    console.log('\n🔍 VALIDACIÓN: Verificando 8 agentes...');
    agents.forEach(agent => {
      if (response.includes(agent)) {
        console.log(`  ✅ ${agent} presente`);
      } else {
        console.log(`  ❌ ${agent} FALTA`);
      }
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST #3: Pregunta sobre empresas del ecosistema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n❓ PREGUNTA ESPECÍFICA: "¿Qué empresas conforman el ecosistema?"\n');
console.log('Trigger: "qué empresas conforman el ecosistema"');

const prompt3 = AURORA.getSystemPrompt(false, 'es', 1, null);
const ecosystemSection = prompt3.match(/❓ PREGUNTA ESPECÍFICA:.*?Escribe @nombreagente para conectar"/s);

if (ecosystemSection) {
  const responseMatch = prompt3.match(/RESPONDE EXACTAMENTE:.*?Escribe @nombreagente para conectar"/s);
  if (responseMatch) {
    const response = responseMatch[0]
      .replace('RESPONDE EXACTAMENTE:', '')
      .replace(/{nombre}/g, 'Diego')
      .trim();
    console.log('\n✅ RESPUESTA ESPERADA:');
    console.log('-'.repeat(80));
    console.log(response);
    console.log('-'.repeat(80));
    
    // Validar que incluya 7 empresas y 8 agentes
    console.log('\n🔍 VALIDACIÓN:');
    if (response.includes('7 empresas')) {
      console.log('  ✅ Menciona "7 empresas"');
    } else {
      console.log('  ❌ NO menciona "7 empresas"');
    }
    
    if (response.includes('8 agentes especializados')) {
      console.log('  ✅ Menciona "8 agentes especializados"');
    } else {
      console.log('  ❌ NO menciona "8 agentes especializados"');
    }
    
    const companies = ['Coworkia', 'MarketingLab', 'PaintBull', 'MedBeneficios', 'SegPopular', 'GR Consulting', 'PropElite'];
    console.log('\n  Empresas mencionadas:');
    companies.forEach(company => {
      if (response.includes(company)) {
        console.log(`    ✅ ${company}`);
      } else {
        console.log(`    ❌ ${company} FALTA`);
      }
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESUMEN FINAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n' + '='.repeat(80));
console.log('✅ TEST COMPLETADO');
console.log('='.repeat(80));
console.log('\n📝 NOTAS:');
console.log('  - Los prompts están en el system prompt de Aurora');
console.log('  - La detección real se hace en campaign-prompts.js');
console.log('  - Este test valida que el contenido esté correcto en aurora.js\n');
