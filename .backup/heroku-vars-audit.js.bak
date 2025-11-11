/**
 * 🔍 AUDITORÍA COMPLETA DE VARIABLES DE ENTORNO
 * Comparación entre Heroku y código fuente
 */

// 📋 VARIABLES EN HEROKU (según imagen):
const HEROKU_VARS = {
  'GOOGLE_CALENDAR_ID': 'secretaria.coworkia@gmail.com',
  'GOOGLE_SERVICE_ACCOUNT_JSON': '{json completo}',
  'OPENAI_API_KEY': 'sk-proj-...',
  'OPENAI_MODEL': 'gpt-4o-mini',
  'WASSENGER_DEVICE_ID': '682de9ea896d635a50b7cd69',
  'WASSENGER_TOKEN': 'e572b534785689a6e8c2e8840a83d8a2...',
  'WHATSAPP_BOT_NUMBER': '593994837117',
  'GMAIL_USER': 'secretaria.coworkia@gmail.com',
  'GMAIL_PASS': 'armw ipcl ofmh dlnc'
};

// 🔍 VARIABLES QUE BUSCA EL CÓDIGO:
const CODIGO_BUSCA = {
  // Email system
  'EMAIL_USER': 'process.env.EMAIL_USER || process.env.GMAIL_USER',
  'EMAIL_PASS': 'process.env.EMAIL_PASS || process.env.GMAIL_PASS', 
  'EMAIL_SERVICE': 'process.env.EMAIL_SERVICE || "gmail"',
  'GMAIL_USER': 'Backup para EMAIL_USER',
  'GMAIL_PASS': 'Backup para EMAIL_PASS',
  
  // WhatsApp/Wassenger
  'WASSENGER_TOKEN': 'Requerido',
  'WASSENGER_DEVICE_ID': 'Requerido (o WASSENGER_DEVICE)',
  'WASSENGER_DEVICE': 'Alternativo a WASSENGER_DEVICE_ID',
  'WHATSAPP_BOT_NUMBER': 'Para evitar mensajes a sí mismo',
  
  // OpenAI
  'OPENAI_API_KEY': 'Requerido',
  'OPENAI_MODEL': 'Opcional, default: gpt-4o-mini',
  
  // Google Services  
  'GOOGLE_SERVICE_ACCOUNT_JSON': 'Para Google Calendar',
  'GOOGLE_CALENDAR_ID': 'Opcional',
  
  // Otros
  'PORT': 'Puerto del servidor (Heroku lo asigna automáticamente)',
  'COWORKIA_BANK_ACCOUNT': 'Opcional, tiene default'
};

console.log('=== 🔍 ANÁLISIS DE VARIABLES DE ENTORNO ===\n');

console.log('✅ VARIABLES CORRECTAS EN HEROKU:');
console.log('- GMAIL_USER ✅');
console.log('- GMAIL_PASS ✅'); 
console.log('- WASSENGER_TOKEN ✅');
console.log('- WASSENGER_DEVICE_ID ✅');
console.log('- OPENAI_API_KEY ✅');
console.log('- OPENAI_MODEL ✅');
console.log('- GOOGLE_SERVICE_ACCOUNT_JSON ✅');
console.log('- WHATSAPP_BOT_NUMBER ✅');

console.log('\n❌ VARIABLES FALTANTES EN HEROKU:');
console.log('- EMAIL_USER (debe ser: secretaria.coworkia@gmail.com)');
console.log('- EMAIL_PASS (debe ser: armw ipcl ofmh dlnc)');
console.log('- EMAIL_SERVICE (opcional: gmail)');

console.log('\n⚠️  VARIABLES CON NOMBRES DIFERENTES:');
console.log('- Código busca: WASSENGER_DEVICE || WASSENGER_DEVICE_ID');
console.log('- Heroku tiene: WASSENGER_DEVICE_ID ✅');

console.log('\n🎯 RECOMENDACIONES:');
console.log('1. Agregar EMAIL_USER = secretaria.coworkia@gmail.com');
console.log('2. Agregar EMAIL_PASS = armw ipcl ofmh dlnc');
console.log('3. Opcional: EMAIL_SERVICE = gmail');

export const MISSING_VARS = [
  { key: 'EMAIL_USER', value: 'secretaria.coworkia@gmail.com', priority: 'HIGH' },
  { key: 'EMAIL_PASS', value: 'armw ipcl ofmh dlnc', priority: 'HIGH' },
  { key: 'EMAIL_SERVICE', value: 'gmail', priority: 'LOW' }
];