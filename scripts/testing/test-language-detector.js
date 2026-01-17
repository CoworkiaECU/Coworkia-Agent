#!/usr/bin/env node
/**
 * 🧪 Test para validar language-detector.js después de v503
 * Verifica: eliminación de Amharic, soporte fr/it/pt, detección automática
 */

import mod from '../../src/utils/language-detector.js';

console.log('🌍 LANGUAGE DETECTOR v503 - VALIDATION TEST\n');
console.log('=' .repeat(60));

// 1. Verificar idiomas soportados
console.log('\n✅ IDIOMAS SOPORTADOS:');
console.log('Keys:', Object.keys(mod.SUPPORTED_LANGUAGES));
console.log('Códigos ISO:', Object.values(mod.SUPPORTED_LANGUAGES));
console.log('Nombres:', mod.LANGUAGE_NAMES);

// 2. Verificar que Amharic NO existe
console.log('\n⚠️  VALIDACIÓN AMHARIC:');
const hasAmharic = Object.values(mod.SUPPORTED_LANGUAGES).includes('am');
console.log('Contiene Amharic (am):', hasAmharic ? '❌ ERROR' : '✅ CORRECTO');

// 3. Verificar nuevos idiomas
console.log('\n✅ VALIDACIÓN NUEVOS IDIOMAS:');
['fr', 'it', 'pt'].forEach(lang => {
  const exists = Object.values(mod.SUPPORTED_LANGUAGES).includes(lang);
  console.log(`${lang}:`, exists ? '✅' : '❌ FALTA');
});

// 4. Test de detección automática
console.log('\n🧪 PRUEBAS DE DETECCIÓN:\n');
const tests = [
  { msg: 'Hola, ¿cómo estás? Necesito ayuda con una reserva', expected: 'es', desc: 'Español' },
  { msg: 'Hello, how are you? I need help with a booking', expected: 'en', desc: 'English' },
  { msg: 'Bonjour, comment allez-vous? J\'ai besoin d\'aide', expected: 'fr', desc: 'Français' },
  { msg: 'Ciao, come stai? Ho bisogno di aiuto con una prenotazione', expected: 'it', desc: 'Italiano' },
  { msg: 'Olá, como você está? Preciso de ajuda com uma reserva', expected: 'pt', desc: 'Português' },
  { msg: 'Napaykullayki, imaynallan kashanki?', expected: 'qu', desc: 'Quechua/Runasimi' }
];

tests.forEach(({ msg, expected, desc }) => {
  const result = mod.detectLanguage(msg);
  const match = result.language === expected;
  console.log(`${match ? '✅' : '❌'} ${desc} (${expected}):`, result.language, `- Conf: ${result.confidence}`);
});

// 5. Test de comandos de cambio
console.log('\n🎯 PRUEBAS DE COMANDOS:\n');
const commands = [
  { cmd: '/french', expected: 'fr', desc: 'Comando /french' },
  { cmd: '/italiano', expected: 'it', desc: 'Comando /italiano' },
  { cmd: '/portugues', expected: 'pt', desc: 'Comando /portugues' },
  { cmd: 'cambiar a francés', expected: 'fr', desc: 'Natural: cambiar a francés' },
  { cmd: 'parla italiano', expected: 'it', desc: 'Natural: parla italiano' },
  { cmd: 'fala português', expected: 'pt', desc: 'Natural: fala português' },
  { cmd: 'cambiar a amárico', expected: null, desc: 'Amharic (debe fallar)' }
];

commands.forEach(({ cmd, expected, desc }) => {
  const result = mod.detectLanguageCommand(cmd);
  const match = result === expected;
  console.log(`${match ? '✅' : '❌'} ${desc}:`, result || 'null');
});

// 6. Test de confirmaciones
console.log('\n💬 MENSAJES DE CONFIRMACIÓN:\n');
['es', 'en', 'fr', 'it', 'pt', 'qu'].forEach(lang => {
  const msg = mod.getLanguageChangeConfirmation(lang);
  console.log(`${lang}: ${msg}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ TEST COMPLETADO\n');
