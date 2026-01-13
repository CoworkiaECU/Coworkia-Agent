#!/usr/bin/env node
/**
 * 🔍 Verificar Estado del Sistema AXEL
 * 
 * Verifica que el código tenga todas las piezas necesarias:
 * - Map de fotos pendientes
 * - Manejo de errores
 * - Flags de estado
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Colores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(status, message, details = '') {
  const symbol = status === 'ok' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
  const color = status === 'ok' ? 'green' : status === 'error' ? 'red' : 'cyan';
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
  if (details) {
    console.log(`   ${colors.yellow}${details}${colors.reset}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('🔍 Verificando Estado del Sistema AXEL');
console.log('='.repeat(60) + '\n');

// 1. Verificar archivo wassenger.js
const wassengerPath = path.join(projectRoot, 'src/express-servidor/endpoints-api/wassenger.js');
const wassengerCode = fs.readFileSync(wassengerPath, 'utf-8');

log('info', 'Verificando wassenger.js...');

// Check 1: Map de fotos pendientes
if (wassengerCode.includes('const axelPendingPhotos = new Map()')) {
  log('ok', 'Map de fotos pendientes declarado');
} else {
  log('error', 'Map de fotos pendientes NO encontrado');
}

// Check 2: Sistema de agrupación
if (wassengerCode.includes('axelPendingPhotos.get(userId)') && 
    wassengerCode.includes('axelPendingPhotos.set(userId')) {
  log('ok', 'Sistema de agrupación implementado');
} else {
  log('error', 'Sistema de agrupación incompleto');
}

// Check 3: Timer de 4 segundos
if (wassengerCode.includes('setTimeout') && wassengerCode.includes('4000')) {
  log('ok', 'Timer de 4 segundos configurado');
} else {
  log('error', 'Timer NO encontrado');
}

// Check 4: Limpieza de cache
if (wassengerCode.includes('axelPendingPhotos.delete(userId)')) {
  log('ok', 'Limpieza de cache implementada');
} else {
  log('error', 'Limpieza de cache faltante');
}

// Check 5: Manejo de error con flag
if (wassengerCode.includes('waitingForPhotoRetry')) {
  log('ok', 'Flag waitingForPhotoRetry implementado');
} else {
  log('error', 'Flag waitingForPhotoRetry NO encontrado');
}

// Check 6: Ignorar mensajes vacíos cuando espera fotos
if (wassengerCode.includes('waiting_photo_retry') || 
    wassengerCode.includes('waitingForPhotoRetry && !text.trim()')) {
  log('ok', 'Prevención de reinicio de conversación implementada');
} else {
  log('error', 'Prevención de reinicio NO implementada');
}

console.log('');
log('info', 'Verificando collision-analysis.js...');

// 2. Verificar archivo collision-analysis.js
const collisionPath = path.join(projectRoot, 'src/servicios/collision-analysis.js');
if (fs.existsSync(collisionPath)) {
  log('ok', 'Servicio de análisis de colisiones existe');
  const collisionCode = fs.readFileSync(collisionPath, 'utf-8');
  
  if (collisionCode.includes('analyzeCollisionPhoto')) {
    log('ok', 'Función analyzeCollisionPhoto exportada');
  }
  
  if (collisionCode.includes('additionalPhotos')) {
    log('ok', 'Soporte para múltiples fotos implementado');
  }
} else {
  log('error', 'Servicio collision-analysis.js NO encontrado');
}

console.log('');
log('info', 'Resumen de configuración...');

// Variables de entorno necesarias
const requiredEnvVars = [
  'WASSENGER_TOKEN',
  'WASSENGER_DEVICE_ID',
  'OPENAI_API_KEY',
  'WEBHOOK_SECURITY_BYPASS',
  'DEBUG_MODE'
];

requiredEnvVars.forEach(varName => {
  // No podemos verificar directamente, solo informar
  log('info', `Variable requerida: ${varName}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Verificación completada');
console.log('='.repeat(60) + '\n');

console.log('Para probar localmente:');
console.log('1. Inicia el servidor: npm run dev');
console.log('2. Ejecuta el test: node scripts/tests-manual/test-axel-photos.mjs');
console.log('3. Revisa los logs para confirmar agrupación de fotos');
console.log('');
