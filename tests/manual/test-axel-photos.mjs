#!/usr/bin/env node
/**
 * 🧪 Test Manual: Sistema de Agrupación de Fotos de AXEL
 * 
 * Simula el envío de múltiples fotos para verificar:
 * - Agrupación con Map en memoria
 * - Timer de 4 segundos
 * - Manejo de errores de OpenAI
 * - Prevención de reinicio de conversación
 */

import axios from 'axios';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_USER = '+593999999999'; // Usuario de prueba

// Fotos de ejemplo (URLs públicas de prueba)
const TEST_PHOTOS = [
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800', // Carro frontal
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800', // Carro lateral
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800', // Carro trasero
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'  // Close-up
];

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji, message, color = 'reset') {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simula un webhook de Wassenger con una foto
 */
async function sendPhotoWebhook(photoUrl, photoNumber) {
  const payload = {
    event: 'message:in:new',
    data: {
      id: `test-${Date.now()}-${photoNumber}`,
      type: 'image',
      fromNumber: TEST_USER,
      from: `${TEST_USER}@c.us`,
      body: '',
      message: '',
      chat: {
        id: `${TEST_USER}@c.us`,
        name: 'Test User'
      },
      media: {
        mime: 'image/jpeg',
        links: {
          download: `/v1/chat/test/files/test-${photoNumber}/download`
        }
      }
    }
  };

  try {
    log('📸', `Enviando foto ${photoNumber}/4...`, 'cyan');
    
    const response = await axios.post(
      `${BASE_URL}/webhooks/wassenger`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (response.data.ok) {
      log('✅', `Foto ${photoNumber} recibida: ${response.data.type || 'processed'}`, 'green');
      return true;
    } else {
      log('❌', `Error en foto ${photoNumber}: ${response.data.error}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌', `Fallo al enviar foto ${photoNumber}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test principal
 */
async function runTest() {
  console.log('\n' + '='.repeat(60));
  log('🧪', 'TEST: Sistema de Agrupación de Fotos AXEL', 'blue');
  console.log('='.repeat(60) + '\n');

  log('📋', `Base URL: ${BASE_URL}`, 'yellow');
  log('👤', `Usuario de prueba: ${TEST_USER}`, 'yellow');
  log('📸', `Fotos a enviar: ${TEST_PHOTOS.length}`, 'yellow');
  console.log('');

  // Paso 1: Activar AXEL para el usuario
  log('🔧', 'Paso 1: Configurando usuario con agente AXEL...', 'cyan');
  await sleep(500);
  log('✅', 'Usuario configurado (asumiendo que existe en DB)', 'green');
  console.log('');

  // Paso 2: Enviar fotos rápidamente (simula usuario enviando múltiples fotos)
  log('📤', 'Paso 2: Enviando 4 fotos rápidamente...', 'cyan');
  const results = [];
  
  for (let i = 0; i < TEST_PHOTOS.length; i++) {
    const success = await sendPhotoWebhook(TEST_PHOTOS[i], i + 1);
    results.push(success);
    
    // Pequeña pausa entre fotos (simula red)
    if (i < TEST_PHOTOS.length - 1) {
      await sleep(300);
    }
  }
  
  const successCount = results.filter(r => r).length;
  console.log('');
  log('📊', `Resultados: ${successCount}/${TEST_PHOTOS.length} fotos enviadas exitosamente`, 
    successCount === TEST_PHOTOS.length ? 'green' : 'yellow');
  console.log('');

  // Paso 3: Esperar a que el timer procese las fotos
  log('⏱️', 'Paso 3: Esperando timer de agrupación (4 segundos)...', 'cyan');
  await sleep(5000);
  console.log('');

  // Paso 4: Verificar que no se reinicie la conversación
  log('🔍', 'Paso 4: Verificando que no hubo reinicio de conversación...', 'cyan');
  log('ℹ️', 'Revisa los logs del servidor para confirmar:', 'yellow');
  log('  ', '- "🚀 Procesando X fotos agrupadas"', 'yellow');
  log('  ', '- NO debe aparecer mensaje genérico de AXEL', 'yellow');
  log('  ', '- Si OpenAI falla, debe guardar waitingForPhotoRetry', 'yellow');
  console.log('');

  // Resumen
  console.log('='.repeat(60));
  log('✅', 'TEST COMPLETADO', 'green');
  console.log('='.repeat(60));
  console.log('\nPasos de verificación manual:');
  console.log('1. Revisa los logs del servidor local');
  console.log('2. Verifica que las fotos se agruparon (1, 2, 3, 4 total)');
  console.log('3. Confirma que el análisis se ejecutó UNA sola vez');
  console.log('4. Si hubo error, verifica que NO apareció mensaje genérico');
  console.log('');
}

/**
 * Test de manejo de error
 */
async function testErrorHandling() {
  console.log('\n' + '='.repeat(60));
  log('🧪', 'TEST: Manejo de Error en Análisis', 'blue');
  console.log('='.repeat(60) + '\n');

  log('⚠️', 'Este test verifica que después de un error:', 'yellow');
  log('  ', '1. Se envía mensaje de error al usuario', 'yellow');
  log('  ', '2. Se guarda flag waitingForPhotoRetry', 'yellow');
  log('  ', '3. Mensajes vacíos posteriores son ignorados', 'yellow');
  log('  ', '4. NO se reinicia conversación con mensaje genérico', 'yellow');
  console.log('');

  log('💡', 'Para simular fallo de OpenAI:', 'cyan');
  log('  ', '1. Temporalmente desconecta internet', 'cyan');
  log('  ', '2. O modifica collision-analysis.js para siempre retornar error', 'cyan');
  log('  ', '3. O usa OPENAI_API_KEY inválida', 'cyan');
  console.log('');

  log('📋', 'Ejecuta el test anterior y observa el comportamiento', 'yellow');
  console.log('');
}

// Ejecutar tests
const testType = process.argv[2] || 'photos';

if (testType === 'error') {
  testErrorHandling();
} else if (testType === 'photos') {
  runTest().catch(error => {
    log('💥', `Error fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
} else {
  console.log('Uso:');
  console.log('  node test-axel-photos.mjs photos    # Test de agrupación de fotos');
  console.log('  node test-axel-photos.mjs error     # Test de manejo de errores');
  console.log('');
  console.log('Variables de entorno:');
  console.log('  TEST_URL=http://localhost:3000  # URL del servidor (default: localhost)');
}
