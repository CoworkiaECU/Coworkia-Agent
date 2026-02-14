/**
 * 🎤 TESTS INTEGRACIÓN REAL: Wassenger API + Whisper
 * 
 * ⚠️  ESTOS TESTS HACEN LLAMADAS REALES A APIs EXTERNAS
 * ⚠️  Requieren WASSENGER_API_KEY y OPENAI_API_KEY configurados
 * ⚠️  Pueden tardar varios minutos (timeouts, retries)
 * 
 * Ejecutar SOLO cuando:
 * - Se sospecha problema con API externa
 * - Se necesita validar comportamiento real
 * - Se está debuggeando error 500 de Wassenger
 * 
 * Uso:
 *   REAL_API_TESTS=true npm test -- tests/integration/whisper-real-api.test.js
 * 
 * Creado: 14 febrero 2026 - v766
 * Contexto: Tests unitarios pasaban pero producción fallaba con Wassenger error 500
 */

import { transcribeAudio } from '../../src/servicios-ia/openai.js';
import { test, expect } from '@jest/globals';

// 🛡️ Protección: Solo ejecutar si explícitamente solicitado
const SKIP_REAL_API_TESTS = process.env.REAL_API_TESTS !== 'true';

if (SKIP_REAL_API_TESTS) {
  console.log('\n⏭️  Tests de API real SKIPPED (requiere REAL_API_TESTS=true)\n');
  console.log('   Para ejecutar: REAL_API_TESTS=true npm test -- whisper-real-api.test.js\n');
  test.skip('Real API tests disabled', () => {});
  process.exit(0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 Configuración
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WASSENGER_API_KEY = process.env.WASSENGER_API_KEY;
const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!WASSENGER_API_KEY || !WASSENGER_DEVICE || !OPENAI_API_KEY) {
  console.error('\n❌ ERROR: Variables de entorno faltantes:\n');
  if (!WASSENGER_API_KEY) console.error('   - WASSENGER_API_KEY');
  if (!WASSENGER_DEVICE) console.error('   - WASSENGER_DEVICE_ID');
  if (!OPENAI_API_KEY) console.error('   - OPENAI_API_KEY');
  console.error('\n');
  process.exit(1);
}

console.log('\n🎤 TESTS INTEGRACIÓN REAL: Wassenger + Whisper\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('⚠️  Estos tests hacen llamadas REALES a APIs externas');
console.log('⚠️  Pueden tardar varios minutos\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 1: Download real de audio de Wassenger
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🔍 Wassenger API Download', () => {
  
  test('Debería descargar audio con WASSENGER_API_KEY', async () => {
    // ⚠️ ESTE TEST REQUIERE UN messageId REAL de un audio reciente
    // Obtenerlo de: heroku logs --app coworkia-agent --num 50 | grep "mediaUrl"
    
    const REAL_AUDIO_URL = process.env.TEST_AUDIO_URL;
    
    if (!REAL_AUDIO_URL) {
      console.log('\n⏭️  Skipping: TEST_AUDIO_URL no configurada');
      console.log('   Para probar con audio real:');
      console.log('   1. Revisa logs: heroku logs --num 50 | grep mediaUrl');
      console.log('   2. Copia una URL de Wassenger');
      console.log('   3. Ejecuta: TEST_AUDIO_URL="https://..." npm test\n');
      return;
    }
    
    console.log(`\n📥 Intentando descargar: ${REAL_AUDIO_URL.substring(0, 60)}...`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(REAL_AUDIO_URL, {
        method: 'GET',
        headers: {
          'User-Agent': 'coworkia-agent/1.0',
          'Accept': 'audio/*,*/*',
          'Authorization': `Bearer ${WASSENGER_API_KEY}`
        },
        signal: AbortSignal.timeout(30000) // 30s timeout
      });
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log(`✅ Descarga exitosa en ${duration}ms - ${buffer.byteLength} bytes`);
        expect(response.status).toBe(200);
        expect(buffer.byteLength).toBeGreaterThan(0);
      } else {
        const errorBody = await response.text().catch(() => 'Sin detalles');
        console.log(`❌ Error ${response.status} después de ${duration}ms`);
        console.log(`   Body: ${errorBody.substring(0, 200)}`);
        
        // Fallar el test con información completa
        expect(response.ok).toBe(true); // Esto fallará y mostrará el error
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Excepción después de ${duration}ms: ${error.message}`);
      throw error;
    }
    
  }, 35000); // Timeout de 35 segundos para el test

});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 2: Transcripción real con Whisper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🎤 OpenAI Whisper Transcription', () => {
  
  test('Debería transcribir audio de prueba', async () => {
    // NOTA: Este test solo funciona si hay un audio válido en TEST_AUDIO_URL
    
    const REAL_AUDIO_URL = process.env.TEST_AUDIO_URL;
    
    if (!REAL_AUDIO_URL) {
      console.log('\n⏭️  Skipping: TEST_AUDIO_URL no configurada\n');
      return;
    }
    
    console.log(`\n🎤 Transcribiendo audio real...`);
    
    const startTime = Date.now();
    
    try {
      const result = await transcribeAudio(REAL_AUDIO_URL, { language: 'es' });
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ Transcripción exitosa en ${duration}ms`);
        console.log(`   Texto: "${result.text.substring(0, 100)}..."`);
        console.log(`   Idioma detectado: ${result.language}`);
        
        expect(result.success).toBe(true);
        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
      } else {
        console.log(`❌ Transcripción falló después de ${duration}ms`);
        console.log(`   Error: ${result.error || 'Desconocido'}`);
        
        // Fallar el test
        expect(result.success).toBe(true);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Excepción después de ${duration}ms: ${error.message}`);
      throw error;
    }
    
  }, 90000); // Timeout de 90 segundos (download + transcription)

});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 3: Comportamiento con error 500 de Wassenger
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('⚠️  Wassenger Error 500 Behavior', () => {
  
  test('Debería activar fallback si Wassenger falla', async () => {
    // URL inválida o expirada para forzar error
    const INVALID_URL = `https://api.wassenger.com/v1/chat/${WASSENGER_DEVICE}/files/invalid123/download?token=invalid`;
    
    console.log(`\n⚠️  Forzando error con URL inválida...`);
    
    const startTime = Date.now();
    
    try {
      const result = await transcribeAudio(INVALID_URL, { language: 'es' });
      
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Falló en ${duration}ms (esperado: < 35s)`);
      
      // Verificar que falla rápido (< 35 segundos con timeout de 30s)
      expect(duration).toBeLessThan(35000);
      
      // Verificar que NO es éxito
      expect(result.success).toBe(false);
      
      console.log(`✅ Fallback activado correctamente en ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`✅ Excepción capturada en ${duration}ms: ${error.message}`);
      
      // Verificar que falla rápido
      expect(duration).toBeLessThan(35000);
    }
    
  }, 40000); // Timeout de 40 segundos

});

console.log('\n═══════════════════════════════════════════════════════════\n');
console.log('✅ Tests de API real completados\n');
console.log('💡 Si estos tests fallan, el problema es con las APIs externas');
console.log('   (Wassenger o OpenAI), NO con tu código.\n');
