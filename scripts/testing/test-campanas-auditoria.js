/**
 * 🔍 AUDITORÍA DE CAMPAÑAS ACTIVAS
 * 
 * Valida que los prompts de campaña funcionan correctamente:
 * 1. "¡Hola Coworkia! quiero probar el servicio"
 * 2. "Aurora, quiero saber ¿qué puede hacer un Agente Virtual como tú para mi empresa?"
 */

import { detectCampaignMessage, personalizeCampaignResponse } from '../../src/servicios/campaign-prompts.js';
import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';

console.log('🔍 AUDITORÍA DE CAMPAÑAS AL AIRE\n');
console.log('=' .repeat(80));

// Configuración de perfiles de prueba
const profileNuevo = {
  name: 'Diego',
  preferredLanguage: 'es',
  freeTrialUsed: false,
  reservationHistory: []
};

const profileRecurrente = {
  name: 'Diego',
  preferredLanguage: 'es',
  freeTrialUsed: true,
  reservationHistory: [{ date: '2026-01-15', serviceType: 'hotDesk', wasFree: true }],
  lastReservation: { date: '2026-01-15', startTime: '10:00', serviceType: 'hotDesk', wasFree: true }
};

// ============================================
// CAMPAÑA #1: "¡Hola Coworkia! quiero probar el servicio"
// ============================================
console.log('\n\n📣 CAMPAÑA #1: "¡Hola Coworkia! quiero probar el servicio"');
console.log('=' .repeat(80));

const variantes1 = [
  '¡Hola Coworkia! quiero probar el servicio',
  '¡Hola Coworkia! quiero probar el servicio ☕️',
  'Hola Coworkia quiero probar',
  'quiero probar el servicio de coworkia',
  'probar servicio coworking',
  'quiero probar el espacio',
  'want to try the service',
  'I want to try coworking'
];

console.log('\n📋 VARIANTES DETECTADAS:');
console.log('-'.repeat(60));

let detected1 = 0;
variantes1.forEach(variante => {
  const detection = detectCampaignMessage(variante);
  
  if (detection.detected) {
    console.log(`✅ "${variante}"`);
    console.log(`   → Campaña: ${detection.campaign}`);
    detected1++;
    
    // Verificar respuesta para nuevo usuario
    if (detection.campaign === 'PROBAR_SERVICIO') {
      const response = personalizeCampaignResponse(
        detection.getTemplate,
        profileNuevo,
        detection.campaign
      );
      
      // Validar que incluya "gratis" para nuevo usuario
      if (response.includes('gratis') || response.includes('free')) {
        console.log(`   ✅ Usuario nuevo: Incluye "gratis"`);
      } else {
        console.log(`   ❌ Usuario nuevo: NO incluye "gratis"`);
      }
      
      // Validar que NO incluya "gratis" para recurrente
      const responseRecurrente = personalizeCampaignResponse(
        detection.getTemplate,
        profileRecurrente,
        detection.campaign
      );
      
      if (!responseRecurrente.includes('gratis') && !responseRecurrente.includes('free')) {
        console.log(`   ✅ Usuario recurrente: NO incluye "gratis"`);
      } else {
        console.log(`   ⚠️  Usuario recurrente: Aún incluye "gratis" (debería decir $10)`);
      }
    }
  } else {
    console.log(`❌ "${variante}" - NO DETECTADA`);
  }
});

console.log(`\n📊 Detección: ${detected1}/${variantes1.length} variantes (${Math.round(detected1/variantes1.length*100)}%)`);

// Validar regex actual
const campaign1 = detectCampaignMessage('¡Hola Coworkia! quiero probar el servicio');
if (campaign1.detected) {
  console.log('\n🔍 REGEX ACTUAL:');
  console.log(`   Pattern: "quiero probar|want to try|essayer|probar.*servicio|..."`);
  console.log(`   ✅ Funcionando correctamente`);
} else {
  console.log('\n❌ REGEX ROTA - No detecta el prompt principal');
}

// ============================================
// CAMPAÑA #2: "Aurora, ¿qué puede hacer un Agente Virtual?"
// ============================================
console.log('\n\n\n📣 CAMPAÑA #2: "Aurora, ¿qué puede hacer un Agente Virtual?"');
console.log('=' .repeat(80));

const variantes2 = [
  'Aurora, quiero saber ¿qué puede hacer un Agente Virtual como tú para mi empresa?',
  'qué puede hacer un agente virtual',
  'capacidades de agente virtual',
  'sistema como tú',
  'chatbot como tú',
  'agente virtual para mi empresa',
  'crear agente virtual',
  'cotizar sistema',
  'what can you do as an agent',
  'what can a virtual agent do',
  'qué puedes hacer',
  'what can you do for my business'
];

console.log('\n📋 VARIANTES DETECTADAS:');
console.log('-'.repeat(60));

let detected2 = 0;
variantes2.forEach(variante => {
  const detection = detectCampaignMessage(variante);
  
  if (detection.detected) {
    console.log(`✅ "${variante}"`);
    console.log(`   → Campaña: ${detection.campaign}`);
    
    if (detection.campaign === 'VENTA_AGENTES_VIRTUALES') {
      detected2++;
      
      // Verificar que incluya información de OneMind
      const response = personalizeCampaignResponse(
        detection.getTemplate,
        profileNuevo,
        detection.campaign
      );
      
      // Validaciones críticas
      const checks = {
        'Menciona OneMind': response.includes('OneMind'),
        'Lista agentes (@aurora, @enzo, etc)': response.includes('@aurora') && response.includes('@enzo'),
        'Menciona precio ($350/mes)': response.includes('$350') || response.includes('350'),
        'Deriva a @enzo': response.includes('@enzo'),
        'Tono entusiasta': response.includes('🚀') || response.includes('😊') || response.includes('✨')
      };
      
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      });
    }
  } else {
    console.log(`❌ "${variante}" - NO DETECTADA`);
  }
});

console.log(`\n📊 Detección: ${detected2}/${variantes2.length} variantes (${Math.round(detected2/variantes2.length*100)}%)`);

// Validar regex actual
const campaign2 = detectCampaignMessage('qué puede hacer un agente virtual');
if (campaign2.detected) {
  console.log('\n🔍 REGEX ACTUAL:');
  console.log(`   Pattern: "agente virtual.*empresa|qu[eé] puede.*hacer.*agente|what can.*you do.*agent|..."`);
  console.log(`   ✅ Funcionando correctamente`);
} else {
  console.log('\n❌ REGEX ROTA - No detecta variantes clave');
}

// ============================================
// TEST INTEGRACIÓN CON ORQUESTADOR
// ============================================
console.log('\n\n\n🔄 TEST DE INTEGRACIÓN CON ORQUESTADOR');
console.log('=' .repeat(80));

const testIntegracion = [
  { input: '¡Hola Coworkia! quiero probar el servicio', expectedAgent: 'AURORA' },
  { input: 'Aurora, qué puede hacer un agente virtual', expectedAgent: 'AURORA' }
];

console.log('\n📋 DETECCIÓN EN ORQUESTADOR:');
console.log('-'.repeat(60));

testIntegracion.forEach(test => {
  const intent = detectarIntencion(test.input, 'AURORA');
  
  if (intent.agent === test.expectedAgent) {
    console.log(`✅ "${test.input}"`);
    console.log(`   → Agente: ${intent.agent}`);
    console.log(`   → Razón: ${intent.reason}`);
  } else {
    console.log(`❌ "${test.input}"`);
    console.log(`   → Esperado: ${test.expectedAgent}, Recibido: ${intent.agent}`);
  }
});

// ============================================
// VALIDACIONES CRÍTICAS
// ============================================
console.log('\n\n\n⚠️  VALIDACIONES CRÍTICAS');
console.log('=' .repeat(80));

const criticalChecks = [];

// Check 1: Campaña #1 detecta prompt exacto
const check1 = detectCampaignMessage('¡Hola Coworkia! quiero probar el servicio');
criticalChecks.push({
  name: 'Campaña #1: Detecta prompt exacto',
  passed: check1.detected && check1.campaign === 'PROBAR_SERVICIO'
});

// Check 2: Campaña #1 NO ofrece gratis a recurrentes
const resp1 = personalizeCampaignResponse(
  check1.getTemplate,
  profileRecurrente,
  'PROBAR_SERVICIO'
);
criticalChecks.push({
  name: 'Campaña #1: NO dice "gratis" a recurrentes',
  passed: !resp1.includes('gratis') && !resp1.includes('free')
});

// Check 3: Campaña #2 detecta prompt exacto
const check2 = detectCampaignMessage('qué puede hacer un agente virtual');
criticalChecks.push({
  name: 'Campaña #2: Detecta prompt exacto',
  passed: check2.detected && check2.campaign === 'VENTA_AGENTES_VIRTUALES'
});

// Check 4: Campaña #2 menciona OneMind
const resp2 = personalizeCampaignResponse(
  check2.getTemplate,
  profileNuevo,
  'VENTA_AGENTES_VIRTUALES'
);
criticalChecks.push({
  name: 'Campaña #2: Menciona OneMind',
  passed: resp2.includes('OneMind')
});

// Check 5: Campaña #2 lista agentes con @menciones
criticalChecks.push({
  name: 'Campaña #2: Lista agentes (@aurora, @enzo, etc)',
  passed: resp2.includes('@aurora') && resp2.includes('@enzo') && resp2.includes('@paula')
});

// Check 6: Campaña #2 deriva a @enzo para cotización
criticalChecks.push({
  name: 'Campaña #2: Deriva a @enzo para cotización',
  passed: resp2.includes('@enzo') && (resp2.toLowerCase().includes('cotiza') || resp2.toLowerCase().includes('habla'))
});

console.log('\n📋 CHECKLIST:');
console.log('-'.repeat(60));

let criticalPassed = 0;
criticalChecks.forEach(check => {
  console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
  if (check.passed) criticalPassed++;
});

// ============================================
// RESUMEN FINAL
// ============================================
console.log('\n\n\n' + '=' .repeat(80));
console.log('📊 RESUMEN DE AUDITORÍA');
console.log('=' .repeat(80));

console.log(`\n📣 CAMPAÑA #1: "¡Hola Coworkia! quiero probar el servicio"`);
console.log(`   Detección: ${detected1}/${variantes1.length} variantes (${Math.round(detected1/variantes1.length*100)}%)`);
console.log(`   Estado: ${detected1 >= variantes1.length * 0.7 ? '✅ ACTIVA' : '❌ PROBLEMAS DE DETECCIÓN'}`);

console.log(`\n📣 CAMPAÑA #2: "Aurora, ¿qué puede hacer un Agente Virtual?"`);
console.log(`   Detección: ${detected2}/${variantes2.length} variantes (${Math.round(detected2/variantes2.length*100)}%)`);
console.log(`   Estado: ${detected2 >= variantes2.length * 0.7 ? '✅ ACTIVA' : '❌ PROBLEMAS DE DETECCIÓN'}`);

console.log(`\n⚠️  VALIDACIONES CRÍTICAS: ${criticalPassed}/${criticalChecks.length}`);

const allPassed = criticalPassed === criticalChecks.length;

if (allPassed) {
  console.log('\n🎉 AUDITORÍA COMPLETA: TODAS LAS CAMPAÑAS FUNCIONANDO CORRECTAMENTE');
  console.log('✅ Listas para marketing/publicidad');
  process.exit(0);
} else {
  console.log('\n⚠️  AUDITORÍA COMPLETA: ALGUNAS VALIDACIONES FALLARON');
  console.log('🔧 Revisar campañas antes de escalar publicidad');
  process.exit(1);
}
