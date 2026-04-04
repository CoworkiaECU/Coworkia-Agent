/**
 * 🧪 Test rápido de Gemini thinking mode
 * Ejecutar: GEMINI_API_KEY=tu-key node scripts/test-gemini.mjs
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Falta GEMINI_API_KEY. Ejecuta con: GEMINI_API_KEY=xxx node scripts/test-gemini.mjs');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  console.log('🧠 Testing Gemini 2.5 Flash con thinking mode...\n');
  const start = Date.now();

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: 200,
      thinkingConfig: { thinkingBudget: 1024 }
    }
  });

  const result = await model.generateContent(
    'Dame 2 razones concretas por las que un negocio en Ecuador debería usar WhatsApp para atención al cliente. Máximo 3 líneas.'
  );

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const text = result.response.text();
  const usage = result.response.usageMetadata;

  console.log(`⏱️  Tiempo: ${elapsed}s`);
  console.log(`✅ Respuesta:\n\n${text}\n`);
  console.log(`📊 Tokens — prompt: ${usage?.promptTokenCount} | thinking: ${usage?.thoughtsTokenCount} | output: ${usage?.candidatesTokenCount}`);
}

test().catch(e => {
  console.error('❌ Error:', e.status || '', e.message);
  if (e.status === 429) {
    console.log('\n💡 Es quota del free tier. Espera 1 minuto y reintenta.');
  }
});
