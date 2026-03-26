#!/usr/bin/env node
/**
 * 📧 Script de testing Dark Mode Inteligente v1150
 * Envía email de prueba a Diego para validar sistema adaptativo:
 * - --xiaomi: Fuerza light mode (xiaomiSafe=true) para testing Xiaomi/MIUI
 * - --iphone: Fuerza dark mode (xiaomiSafe=false) para testing iOS/Gmail
 * - Sin flags: usa default (dark mode habilitado)
 */

import { sendEmail, isXiaomiDevice } from '../src/servicios/email.js';
import { buildEmailTemplate } from '../src/servicios/email-template-system.js';

// Email de Diego (verifica en su Xiaomi + puede reenviar a iPhone)
const DIEGO_EMAIL = process.env.DIEGO_EMAIL || 'yo@diegovillota.com';

// 🎛️ Detectar flags CLI
const args = process.argv.slice(2);
const forceXiaomi = args.includes('--xiaomi');
const forceIphone = args.includes('--iphone');

// Determinar modo
let xiaomiSafe, modeLabel, testDevice;
if (forceXiaomi) {
  xiaomiSafe = true;
  modeLabel = 'Light Mode (Xiaomi/MIUI)';
  testDevice = 'Xiaomi';
} else if (forceIphone) {
  xiaomiSafe = false;
  modeLabel = 'Dark Mode (iPhone/Gmail)';
  testDevice = 'iPhone';
} else {
  xiaomiSafe = false; // Default: dark mode para clientes modernos
  modeLabel = 'Default Dark Mode';
  testDevice = 'Automático (detecta dark mode sistema)';
}

console.log(`📧 [TEST-DARKMODE] Generando email de prueba v1150...\n`);
console.log(`🎛️  Modo: ${modeLabel}`);
console.log(`📱  Dispositivo target: ${testDevice}`);
console.log(`🔧  xiaomiSafe = ${xiaomiSafe}\n`);

// Usar template Aluna D+1 (diseño verde Coworkia aprobado, muchos estilos)
const emailHTML = buildEmailTemplate('aluna', 'D1', {
  name: 'Diego Villota',
  message: `Diego nena, este es un email de TESTING v1150 — Dark Mode Inteligente.

🎯 MODO DE PRUEBA: *${modeLabel}*
📱 Target device: ${testDevice}

🔬 QUÉ ESPERAR:

${forceXiaomi ? `
✅ **Xiaomi/MIUI Mode (Light Only)**:
   - Sin @media (prefers-color-scheme: dark)
   - Colores forzados a light mode
   - Fondo blanco, texto oscuro siempre
   - Xiaomi NO podrá cambiarlo a dark (esperado)
` : `
✅ **iPhone/Gmail Mode (Adaptive Dark)**:
   - Incluye @media (prefers-color-scheme: dark)
   - Si tu teléfono está en dark mode → email se adapta
   - Si está en light mode → email light normal
   - Respeta preferencia del sistema operativo
`}

🔍 VALIDACIÓN TÉCNICA:
✅ Header verde Coworkia legible
✅ Card blanca con tu nombre visible
✅ Botones con colores correctos
✅ Texto no quemado (negro sobre negro)
✅ Logo e imágenes cargan

📝 RESPONDE:
- Si todo OK → "OK ${forceXiaomi ? 'Xiaomi' : 'iPhone'}" en el chat
- Si falla → screenshot + descripción

Ignora contenido de membresía, esto es solo validación técnica.`,
  plan: `Test v1150 — ${modeLabel}`
}, { xiaomiSafe }); // ← OPCIÓN THREADING

console.log('✅ Template generado con options threading');
console.log(`📤 Enviando a: ${DIEGO_EMAIL}\n`);

try {
  const result = await sendEmail({
    to: DIEGO_EMAIL,
    subject: `🧪 TEST v1150 ${modeLabel} — Aluna Coworkia`,
    html: emailHTML,
    text: `Email de testing v1150 Dark Mode Inteligente. Modo: ${modeLabel}. Verifica que se vea correctamente en ${testDevice}. Responde OK si todo perfecto.`
  });

  if (result.success) {
    console.log('✅ Email enviado exitosamente');
    console.log(`📧 MessageId: ${result.messageId}\n`);
    console.log('🔍 INSTRUCCIONES PARA DIEGO:');
    console.log('   1. Abre el email en tu Xiaomi');
    console.log('   2. Verifica que los colores verdes se vean bien (header, botones)');
    console.log('   3. Chequea que el texto sea legible (no negro sobre negro)');
    console.log('   4. Valida que la card blanca con tu nombre se ve correcta');
    console.log('   5. Responde "OK Xiaomi" si se ve perfecto, o reporta problemas\n');
  } else {
    console.error('❌ Error enviando email:', result.error);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
}

console.log('🏁 Test completado. Esperando validación de Diego...');
