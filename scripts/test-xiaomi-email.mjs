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

// Usar template Adriana Comparison V2 (tiene muchos estilos y colores)
const emailHTML = buildEmailTemplate('adriana', 'COMPARISON_V2', {
  nombre: 'Diego Villota',
  marca: 'Chevrolet',
  modelo: 'Captiva',
  anio: '2019',
  placa: 'ABC-1234',
  valor_asegurado: '$42,000',
  vaz_prima_anual: '$1,101',
  vaz_prima_mensual: '$110',
  vaz_deducible: '7% (Taller VAZ)',
  analisis_broker: 'Diego, este es un email de TESTING v1149 para validar compatibilidad Xiaomi. Verifica que se vea bien en dark mode de tu celular. Si los colores se ven bien y el texto es legible, significa que el fix funcionó correctamente.',
  competitors: [
    {
      nombre: 'Best Seguros',
      plan: 'Total',
      prima_anual: '$1,310',
      prima_mensual: '$131',
      deducible: '10%',
      asistencia: 'Extra'
    },
    {
      nombre: 'Latina Seguros',
      plan: 'Estándar',
      prima_anual: '$1,280',
      prima_mensual: '$128',
      deducible: '8%',
      asistencia: '24h (limitada)'
    }
  ],
  fecha_cotizacion: new Date().toLocaleDateString('es-EC', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }),
  bot_phone: '593994837117'
});

console.log('✅ Template generado');
console.log(`📤 Enviando a: ${DIEGO_EMAIL}\n`);

try {
  const result = await sendEmail({
    to: DIEGO_EMAIL,
    subject: '🧪 TEST v1149 Xiaomi — Adriana Seguros',
    html: emailHTML,
    text: 'Email de testing v1149 para validar compatibilidad Xiaomi/MIUI. Verifica que se vea bien en tu celular (dark mode) y también chequea en iPhone y Gmail desktop.'
  });

  if (result.success) {
    console.log('✅ Email enviado exitosamente');
    console.log(`📧 MessageId: ${result.messageId}\n`);
    console.log('🔍 INSTRUCCIONES PARA DIEGO:');
    console.log('   1. Abre el email en tu Xiaomi');
    console.log('   2. Verifica que los colores se vean bien (fondo azul, header, tablas)');
    console.log('   3. Chequea que el texto sea legible (no negro sobre negro)');
    console.log('   4. Opcional: reenvía a tu iPhone para validar no regression');
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
