#!/usr/bin/env node
/**
 * 📧 Script de testing Xiaomi v1149
 * Envía email de prueba a Diego para validar:
 * - Xiaomi/MIUI (dark mode eliminado, light mode universal)
 * - iPhone (no regression)
 * - Gmail desktop (no regression)
 */

import { sendEmail } from '../src/servicios/email.js';
import { buildEmailTemplate } from '../src/servicios/email-template-system.js';

// Email de Diego (verifica en su Xiaomi + puede reenviar a iPhone)
const DIEGO_EMAIL = process.env.DIEGO_EMAIL || 'yo@diegovillota.com';

console.log('📧 [TEST-XIAOMI] Generando email de prueba v1149...\n');

// Usar template Aluna D+1 (diseño verde Coworkia aprobado, muchos estilos)
const emailHTML = buildEmailTemplate('aluna', 'D1', {
  name: 'Diego Villota',
  message: `Diego nena, este es un email de TESTING v1149 para validar compatibilidad Xiaomi/MIUI.

🧪 VALIDACIÓN TÉCNICA:
- Eliminamos @media (prefers-color-scheme:dark) que Xiaomi ignora
- Forzamos light mode universal con inline styles
- Todos los colores ahora son explícitos (no dependen de dark mode del sistema)

🔍 POR FAVOR VERIFICA:
✅ Colores del header verde se ven correctos
✅ Texto legible (no negro sobre negro)
✅ Card blanca con tu nombre se ve bien
✅ Botones y CTAs tienen los colores correctos
✅ Logo e imágenes cargan correctamente

Si todo se ve perfecto → responde "OK Xiaomi" en el chat
Si algo falla → screenshot + descripción del problema

Esto es solo testing técnico, ignora el contenido de membresía.`,
  plan: 'Membresía Test v1149'
});

console.log('✅ Template generado');
console.log(`📤 Enviando a: ${DIEGO_EMAIL}\n`);

try {
  const result = await sendEmail({
    to: DIEGO_EMAIL,
    subject: '🧪 TEST v1149 Xiaomi — Aluna Coworkia',
    html: emailHTML,
    text: 'Email de testing v1149 para validar compatibilidad Xiaomi/MIUI. Verifica que se vea bien en tu celular (colores, texto legible, layout correcto). Responde OK Xiaomi si todo perfecto.'
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
