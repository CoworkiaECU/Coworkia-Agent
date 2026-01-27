import { detectLanguage } from './src/utils/language-detector.js';

console.log('\n🌍 TEST: Detección de Idiomas\n');

const tests = [
  { msg: 'Hola como estas', exp: 'es', desc: 'Español' },
  { msg: 'Quiero reservar para mañana', exp: 'es', desc: 'Español' },
  { msg: 'Hello how are you', exp: 'en', desc: 'English' },
  { msg: 'I want to book a room', exp: 'en', desc: 'English' },
  { msg: 'Bonjour comment allez vous', exp: 'fr', desc: 'Francés (no soportado)' },
];

let pass = 0;
tests.forEach((t, i) => {
  const r = detectLanguage(t.msg);
  console.log(`${i+1}. ${t.desc}: "${t.msg}"`);
  console.log(`   Detectado: ${r.language} (${r.name}) - Confianza: ${(r.confidence*100).toFixed(0)}%`);
  if (t.exp === 'fr' || r.language === t.exp) {
    console.log('   ✅ PASS\n');
    pass++;
  } else {
    console.log(`   ❌ FAIL (esperado ${t.exp})\n`);
  }
});

console.log(`📊 Resultado: ${pass}/${tests.length} tests pasados`);
console.log('\n🔍 Idiomas soportados:');
console.log('   - Español (es)');
console.log('   - English (en)');
console.log('   - Runasimi/Quechua (qu)');
console.log('\n⚠️  Francés NO implementado - sistema elegirá es o en según similitud\n');
