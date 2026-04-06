/**
 * 🧪 Test: Enzo prompt v1210 — Simular caso LavaYá
 * Verifica que Enzo: (a) propone solución antes de preguntar,
 * (b) no interrogatorio mecánico, (c) mantiene español.
 * 
 * Ejecutar: DATABASE_URL=$(heroku config:get DATABASE_URL --app coworkia-agent) node scripts/test-enzo-prompt-v1210.mjs
 */

import { ENZO } from '../src/deteccion-intenciones/enzo.js';
import { complete } from '../src/servicios-ia/openai.js';

const CASES = [
  {
    name: 'LavaYá — lavandería 3 locales',
    message: 'Hola, tengo una lavandería que se llama LavaYá, tenemos 3 locales en Quito y queremos presencia digital, captar más clientes y que nos encuentren fácil',
    conversationCount: 0,
  },
  {
    name: 'LavaYá — segundo mensaje (continuación)',
    message: 'Me interesa lo del agente WhatsApp, pero también necesito que me vean en Google cuando alguien busque "lavandería cerca de mí"',
    conversationCount: 2,
  },
  {
    name: 'Restaurante genérico — primer contacto',
    message: 'Tengo un restaurante y quiero que la gente haga pedidos por WhatsApp sin llamar',
    conversationCount: 0,
  },
];

console.log('🧪 TEST ENZO PROMPT v1210 — Simulación de casos reales\n');
console.log('═'.repeat(70));

for (const testCase of CASES) {
  console.log(`\n📌 CASO: ${testCase.name}`);
  console.log(`👤 Cliente: "${testCase.message}"`);
  console.log('─'.repeat(60));

  const systemPrompt = ENZO.getSystemPrompt(false, 'es', testCase.conversationCount);

  try {
    const reply = await complete(testCase.message, {
      system: systemPrompt,
      temperature: 0.7,
      max_tokens: 1200,
      model: 'gpt-4o',
    });

    console.log(`\n🤖 ENZO responde:\n${reply}\n`);

    // Validaciones automáticas
    const checks = {
      '✅ Propone solución concreta': /(?:sistema|agente|whatsapp|qr|pedido|menú|captación|google|seo|campañ)/i.test(reply),
      '✅ NO hace lista numerada genérica': !/^1\.\s.*\n2\.\s.*\n3\.\s/m.test(reply),
      '✅ Máx 1 pregunta al final': (reply.match(/\?/g) || []).length <= 2,
      '✅ En español': !/\b(let me|I can|would you|here\'s)\b/i.test(reply),
      '✅ Menciona empresa por nombre': testCase.name.includes('LavaYá') ? /lava/i.test(reply) : true,
      '✅ Corto (< 600 chars)': reply.length < 600,
    };

    for (const [check, passed] of Object.entries(checks)) {
      console.log(`  ${passed ? check : check.replace('✅', '❌')} ${!passed ? `(${check.includes('Corto') ? reply.length + ' chars' : 'FALLO'})` : ''}`);
    }

    const allPassed = Object.values(checks).every(Boolean);
    console.log(`\n${allPassed ? '🟢 CASO OK' : '🟡 REVISAR'}`);
  } catch (err) {
    console.error(`  ❌ Error OpenAI: ${err.message}`);
  }

  console.log('═'.repeat(70));
}

console.log('\n✅ Test completado');
process.exit(0);
