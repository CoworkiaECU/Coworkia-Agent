#!/usr/bin/env node
/**
 * 📧 Script de testing Dark Mode Inteligente v1151
 * Envía email de prueba a Diego para validar sistema adaptativo:
 * - --xiaomi: Fuerza light mode (xiaomiSafe=true) para testing Xiaomi/MIUI/Honor
 * - --iphone: Fuerza dark mode (xiaomiSafe=false) para testing iOS/Gmail
 * - Sin flags: usa default (dark mode habilitado)
 */

import { sendEmail, isXiaomiDevice } from '../src/servicios/email.js';
import { buildEmailTemplate } from '../src/servicios/email-template-system.js';

// 🎛️ Detectar flags CLI
const args = process.argv.slice(2);
const forceXiaomi = args.includes('--xiaomi');
const forceIphone = args.includes('--iphone');

// Email destinatario (acepta --to=email@example.com o usa default)
const emailArg = args.find(arg => arg.startsWith('--to='));
const TEST_EMAIL = emailArg ? emailArg.split('=')[1] : 'usavipshop@gmail.com';

// Determinar modo
let xiaomiSafe, modeLabel, testDevice;
if (forceXiaomi) {
  xiaomiSafe = true;
  modeLabel = 'Light Mode (Xiaomi/Honor/MIUI)';
  testDevice = 'Xiaomi/Honor';
} else if (forceIphone) {
  xiaomiSafe = false;
  modeLabel = 'Dark Mode (iPhone/Gmail)';
  testDevice = 'iPhone';
} else {
  xiaomiSafe = false; // Default: dark mode para clientes modernos
  modeLabel = 'Default Dark Mode';
  testDevice = 'Automático (detecta dark mode sistema)';
}

console.log(`📧 [TEST-DARKMODE] Generando email de prueba v1151...\n`);
console.log(`🎛️  Modo: ${modeLabel}`);
console.log(`📱  Dispositivo target: ${testDevice}`);
console.log(`🔧  xiaomiSafe = ${xiaomiSafe}\n`);

// Usar template Aluna D+1 (diseño verde Coworkia aprobado, muchos estilos)
const emailHTML = buildEmailTemplate('aluna', 'D1', {
  name: 'Francisco Zapata',
  message: `Hola Francisco, este es un email de TESTING v1151 — Dark Mode Inteligente + Responsive Fix de Coworkia.

🎯 MODO DE PRUEBA: *${modeLabel}*
📱 Target device: ${testDevice}

🔬 QUÉ ESPERAR EN TU MOTOROLA:

${forceXiaomi ? `
✅ **Light Mode Only** (para Xiaomi/Honor):
   - Colores forzados a modo claro
   - Fondo blanco, texto oscuro siempre
   - Sin adaptación automática
   - width:100% responsive (no corta contenido)
` : `
✅ **Dark Mode Adaptativo** (modo predeterminado):
   - Si tu Motorola está en modo oscuro → email se adapta automáticamente
   - Si está en modo claro → email light normal
   - Respeta la preferencia de tu sistema operativo
   - width:100% responsive en todos los dispositivos
   - NO corta contenido a la derecha
`}

🔍 VALIDA POR FAVOR:
✅ Header verde Coworkia se ve bien
✅ Card blanca con tu nombre es legible
✅ Botones tienen los colores correctos
✅ Texto legible (no negro sobre negro)
✅ Logo e imágenes cargan correctamente
✅ NO se corta contenido por la derecha (FIX Motorola)

📝 Si puedes, responde confirmando que se ve bien en tu Motorola.

Gracias por ayudarnos a testear el sistema! 🙌

Ignora el contenido de membresía, esto es solo validación técnica.`,
  plan: `Test v1151 — ${modeLabel}`
}, { xiaomiSafe }); // ← OPCIÓN THREADING

console.log('✅ Template generado con options threading');
console.log(`📤 Enviando a: ${TEST_EMAIL}\n`);

try {
  const result = await sendEmail({
    to: TEST_EMAIL,
    subject: `🧪 TEST v1151 ${modeLabel} — Aluna Coworkia`,
    html: emailHTML,
    text: `Email de testing v1151 Dark Mode Inteligente + Responsive. Modo: ${modeLabel}. Verifica que se vea correctamente en ${testDevice}. Responde OK si todo perfecto.`
  });

  if (result.success) {
    console.log('✅ Email enviado exitosamente');
    console.log(`📧 MessageId: ${result.messageId}\n`);
    console.log('🔍 INSTRUCCIONES PARA FRANCISCO (Motorola test):');
    console.log('   1. Abre el email en tu Motorola');
    console.log('   2. Verifica que los colores verdes se vean bien (header, botones)');
    console.log('   3. Chequea que el texto sea legible (no negro sobre negro)');
    console.log('   4. Valida que la card blanca con tu nombre se ve correcta');
    console.log('   5. Si está en dark mode → verifica que el email se adapta automáticamente');
    console.log('   6. Responde confirmando si se ve bien o reporta cualquier problema\n');
  } else {
    console.error('❌ Error enviando email:', result.error);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
}

console.log('🏁 Test completado. Esperando validación de Diego...');
