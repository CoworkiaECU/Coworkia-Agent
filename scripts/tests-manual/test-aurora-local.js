#!/usr/bin/env node
/**
 * 🧪 Test Local de Aurora
 * 
 * Simulador de webhook de Wassenger para probar Aurora localmente
 * sin tener que deployar a Heroku cada vez.
 * 
 * Uso:
 *   node scripts/test-aurora-local.js "hola"
 *   node scripts/test-aurora-local.js "necesito una sala para mañana a las 3pm"
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env.development') });

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Teléfono de prueba
const TEST_PHONE = '+593987770788';
const TEST_NAME = 'Diego Test';

/**
 * Simula un webhook de Wassenger
 */
async function sendTestMessage(message) {
  console.log(`\n🧪 [TEST] Enviando mensaje: "${message}"`);
  console.log(`📞 [TEST] Teléfono: ${TEST_PHONE}`);
  console.log(`🌐 [TEST] URL: ${BASE_URL}/webhooks/wassenger\n`);

  const payload = {
    event: 'message:in:new',
    data: {
      id: `test-${Date.now()}`,
      fromNumber: TEST_PHONE,
      fromName: TEST_NAME,
      body: message,
      timestamp: new Date().toISOString(),
      type: 'text',
      device: {
        id: 'test-device',
        alias: 'Test Device'
      }
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/webhooks/wassenger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Wassenger-Webhook-Test/1.0'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    console.log(`✅ [TEST] Status: ${response.status}`);
    console.log(`📝 [TEST] Respuesta:\n${responseText}\n`);

    if (response.status !== 200) {
      console.error(`❌ [TEST] Error: Expected 200, got ${response.status}`);
    }

    return { status: response.status, body: responseText };
  } catch (error) {
    console.error(`❌ [TEST] Error al enviar mensaje:`, error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`\n⚠️  El servidor no está corriendo en ${BASE_URL}`);
      console.error(`   Inicia el servidor con: npm run dev\n`);
    }
    
    throw error;
  }
}

/**
 * Conversación de prueba completa
 */
async function runConversationTest() {
  console.log('\n🎭 [TEST] Iniciando conversación de prueba completa...\n');
  
  const messages = [
    'hola',
    'necesito una sala para mañana a las 3pm',
    'mi email es diego@test.com',
    'confirmar'
  ];

  for (const msg of messages) {
    await sendTestMessage(msg);
    // Esperar un poco entre mensajes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ [TEST] Conversación de prueba completada\n');
}

/**
 * Test de cancelación
 */
async function runCancellationTest() {
  console.log('\n🚫 [TEST] Test de cancelación...\n');
  
  await sendTestMessage('necesito una sala para hoy a las 5pm');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await sendTestMessage('cancela');
  
  console.log('\n✅ [TEST] Test de cancelación completado\n');
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
🧪 Test Local de Aurora

Uso:
  node scripts/test-aurora-local.js "tu mensaje aquí"
  node scripts/test-aurora-local.js --conversation
  node scripts/test-aurora-local.js --cancel

Ejemplos:
  node scripts/test-aurora-local.js "hola"
  node scripts/test-aurora-local.js "necesito una sala para mañana"
  node scripts/test-aurora-local.js --conversation  # Conversación completa
  node scripts/test-aurora-local.js --cancel        # Test de cancelación

Nota: Asegúrate de que el servidor esté corriendo con: npm run dev
  `);
  process.exit(1);
}

(async () => {
  try {
    if (command === '--conversation') {
      await runConversationTest();
    } else if (command === '--cancel') {
      await runCancellationTest();
    } else {
      await sendTestMessage(args.join(' '));
    }
  } catch (error) {
    console.error('\n❌ [TEST] Test falló:', error.message);
    process.exit(1);
  }
})();
