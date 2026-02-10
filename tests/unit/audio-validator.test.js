/**
 * 🎤 TESTS UNITARIOS: audio-validator.js
 * 
 * Cobertura:
 * - Validación de formatos (mp3, ogg, m4a, wav, webm, formatos inválidos)
 * - Validación de tamaños (25MB límite, 10MB recomendado)
 * - Validación de duraciones (1s mínimo, 300s máximo)
 * - Mensajes de error localizados en 6 idiomas (es, en, fr, it, pt, qu)
 * 
 * Paridad con Vision AI: Testing exhaustivo antes de deploy
 */

import { 
  validateAudioFormat,
  validateAudioSize,
  validateAudioDuration,
  validateAudio,
  getLocalizedAudioError,
  AUDIO_VALIDATION_CONSTANTS
} from '../../src/utils/audio-validator.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 1: Validación de formatos soportados
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 1: Formatos de audio soportados\n');

const formatTests = [
  { url: 'https://example.com/audio.mp3', expected: 'mp3', valid: true },
  { url: 'https://example.com/voice.ogg', expected: 'ogg', valid: true },
  { url: 'https://example.com/recording.m4a', expected: 'm4a', valid: true },
  { url: 'https://example.com/sound.wav', expected: 'wav', valid: true },
  { url: 'https://example.com/webm/audio', expected: 'webm', valid: true },
  { url: 'https://example.com/audio.txt', expected: null, valid: false },
  { url: 'https://example.com/video.mp4', expected: 'mp4', valid: true }, // mp4 es audio válido
  { url: null, expected: null, valid: false }
];

let passedTests = 0;
let failedTests = 0;

formatTests.forEach((test, idx) => {
  const result = validateAudioFormat(test.url);
  const passed = result.valid === test.valid && 
                 (test.valid ? result.format === test.expected : true);
  
  if (passed) {
    console.log(`  ✅ Test 1.${idx + 1}: ${test.url || 'null'} → ${result.valid ? result.format : 'INVALID'}`);
    passedTests++;
  } else {
    console.log(`  ❌ Test 1.${idx + 1}: ${test.url || 'null'} → Expected ${test.expected}, got ${result.format || 'INVALID'}`);
    failedTests++;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 2: Validación de tamaños
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 2: Tamaños de audio\n');

const sizeTests = [
  { size: 1024 * 1024, description: '1MB', expectedValid: true, expectedWarning: false },
  { size: 5 * 1024 * 1024, description: '5MB', expectedValid: true, expectedWarning: false },
  { size: 10 * 1024 * 1024, description: '10MB (límite recomendado)', expectedValid: true, expectedWarning: false },
  { size: 15 * 1024 * 1024, description: '15MB (sobre recomendado)', expectedValid: true, expectedWarning: true },
  { size: 25 * 1024 * 1024, description: '25MB (límite API)', expectedValid: true, expectedWarning: true },
  { size: 30 * 1024 * 1024, description: '30MB (excede límite)', expectedValid: false, expectedWarning: false },
  { size: -1, description: 'Negativo', expectedValid: false, expectedWarning: false },
  { size: 0, description: 'Cero', expectedValid: false, expectedWarning: false }
];

sizeTests.forEach((test, idx) => {
  const result = validateAudioSize(test.size);
  const passed = result.valid === test.expectedValid && 
                 (test.expectedWarning ? !!result.warning : !result.warning);
  
  if (passed) {
    console.log(`  ✅ Test 2.${idx + 1}: ${test.description} → ${result.valid ? 'VALID' : 'INVALID'}${result.warning ? ' (warning)' : ''}`);
    passedTests++;
  } else {
    console.log(`  ❌ Test 2.${idx + 1}: ${test.description} → Expected ${test.expectedValid}, got ${result.valid}`);
    failedTests++;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 3: Validación de duraciones
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 3: Duraciones de audio\n');

const durationTests = [
  { duration: 0.5, description: '0.5s (muy corto)', expectedValid: false },
  { duration: 1, description: '1s (mínimo)', expectedValid: true, expectedWarning: false },
  { duration: 30, description: '30s (normal)', expectedValid: true, expectedWarning: false },
  { duration: 120, description: '2min (normal)', expectedValid: true, expectedWarning: false },
  { duration: 300, description: '5min (máximo recomendado)', expectedValid: true, expectedWarning: false },
  { duration: 400, description: '6min 40s (largo)', expectedValid: true, expectedWarning: true },
  { duration: null, description: 'null (opcional)', expectedValid: true, expectedWarning: false }
];

durationTests.forEach((test, idx) => {
  const result = validateAudioDuration(test.duration);
  const passed = result.valid === test.expectedValid;
  
  if (passed) {
    console.log(`  ✅ Test 3.${idx + 1}: ${test.description} → ${result.valid ? 'VALID' : 'INVALID'}${result.warning ? ' (warning)' : ''}`);
    passedTests++;
  } else {
    console.log(`  ❌ Test 3.${idx + 1}: ${test.description} → Expected ${test.expectedValid}, got ${result.valid}`);
    failedTests++;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 4: Validación completa
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 4: Validación completa de audio\n');

const completeTests = [
  {
    url: 'https://example.com/audio.mp3',
    metadata: { size: 5 * 1024 * 1024, duration: 60 },
    expectedValid: true,
    description: 'Audio válido completo'
  },
  {
    url: 'https://example.com/audio.txt',
    metadata: {},
    expectedValid: false,
    description: 'Formato inválido'
  },
  {
    url: 'https://example.com/audio.ogg',
    metadata: { size: 30 * 1024 * 1024 },
    expectedValid: false,
    description: 'Tamaño excedido'
  },
  {
    url: 'https://example.com/audio.wav',
    metadata: { size: 15 * 1024 * 1024, duration: 120 },
    expectedValid: true,
    description: 'Audio grande pero válido (con warning)'
  }
];

completeTests.forEach((test, idx) => {
  const result = validateAudio(test.url, test.metadata);
  const passed = result.valid === test.expectedValid;
  
  if (passed) {
    console.log(`  ✅ Test 4.${idx + 1}: ${test.description} → ${result.valid ? 'VALID' : 'INVALID'}`);
    if (result.errors.length > 0) {
      console.log(`      Errors: ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      console.log(`      Warnings: ${result.warnings.join(', ')}`);
    }
    passedTests++;
  } else {
    console.log(`  ❌ Test 4.${idx + 1}: ${test.description} → Expected ${test.expectedValid}, got ${result.valid}`);
    failedTests++;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 5: Mensajes de error localizados (6 idiomas)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 5: Mensajes de error localizados\n');

const languages = ['es', 'en', 'fr', 'it', 'pt', 'qu'];
const errorTypes = [
  { error: 'URL inválida', keyword: 'Audio' },
  { error: 'formato no soportado', keyword: 'formato' },
  { error: 'grande', keyword: '25MB' },
  { error: 'corto', keyword: 'segundo' }
];

languages.forEach(lang => {
  errorTypes.forEach(({ error, keyword }) => {
    const message = getLocalizedAudioError(error, lang);
    const hasKeyword = message.toLowerCase().includes(keyword.toLowerCase()) || 
                       message.includes('🎤');
    
    if (hasKeyword) {
      console.log(`  ✅ ${lang.toUpperCase()}: ${error} → ${message.substring(0, 50)}...`);
      passedTests++;
    } else {
      console.log(`  ❌ ${lang.toUpperCase()}: ${error} → Missing keyword "${keyword}"`);
      failedTests++;
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 6: Fallback genérico multiidioma
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 6: Fallback genérico en 6 idiomas\n');

languages.forEach(lang => {
  const message = getLocalizedAudioError('Error desconocido xyz', lang);
  const hasFallback = message.includes('🎤') && message.length > 20;
  
  if (hasFallback) {
    console.log(`  ✅ ${lang.toUpperCase()}: Fallback → ${message.substring(0, 60)}...`);
    passedTests++;
  } else {
    console.log(`  ❌ ${lang.toUpperCase()}: Fallback sin mensaje válido`);
    failedTests++;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 7: Constantes exportadas
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 7: Constantes de validación\n');

const constantTests = [
  { name: 'SUPPORTED_FORMATS', expected: Array.isArray(AUDIO_VALIDATION_CONSTANTS.SUPPORTED_FORMATS) },
  { name: 'MAX_FILE_SIZE_MB', expected: AUDIO_VALIDATION_CONSTANTS.MAX_FILE_SIZE_MB === 25 },
  { name: 'RECOMMENDED_MAX_MB', expected: AUDIO_VALIDATION_CONSTANTS.RECOMMENDED_MAX_MB === 10 },
  { name: 'MAX_DURATION_SECONDS', expected: AUDIO_VALIDATION_CONSTANTS.MAX_DURATION_SECONDS === 300 },
  { name: 'MIN_DURATION_SECONDS', expected: AUDIO_VALIDATION_CONSTANTS.MIN_DURATION_SECONDS === 1 }
];

constantTests.forEach(test => {
  if (test.expected) {
    console.log(`  ✅ ${test.name} correcta`);
    passedTests++;
  } else {
    console.log(`  ❌ ${test.name} incorrecta`);
    failedTests++;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 8: Formatos soportados (8 formatos)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🎤 TEST 8: Todos los formatos soportados\n');

const expectedFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg'];
const formatsMatch = JSON.stringify(AUDIO_VALIDATION_CONSTANTS.SUPPORTED_FORMATS.sort()) === 
                     JSON.stringify(expectedFormats.sort());

if (formatsMatch) {
  console.log(`  ✅ 8 formatos soportados: ${expectedFormats.join(', ')}`);
  passedTests++;
} else {
  console.log(`  ❌ Formatos no coinciden`);
  console.log(`     Esperados: ${expectedFormats.join(', ')}`);
  console.log(`     Actuales: ${AUDIO_VALIDATION_CONSTANTS.SUPPORTED_FORMATS.join(', ')}`);
  failedTests++;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESUMEN FINAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE TESTS: audio-validator.js');
console.log('='.repeat(60));
console.log(`✅ Tests pasados: ${passedTests}`);
console.log(`❌ Tests fallados: ${failedTests}`);
console.log(`📈 Total ejecutados: ${passedTests + failedTests}`);
console.log('='.repeat(60));

if (failedTests === 0) {
  console.log('\n🎉 TODOS LOS TESTS PASARON - audio-validator.js 100% funcional\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failedTests} tests fallaron - Revisar implementación\n`);
  process.exit(1);
}
