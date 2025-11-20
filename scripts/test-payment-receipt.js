#!/usr/bin/env node
/**
 * 🧪 Script para probar lectura de comprobantes de pago
 * Uso: node scripts/test-payment-receipt.js <URL_IMAGEN>
 */

import { analyzePaymentReceipt } from '../src/servicios-ia/openai.js';
import { processPaymentReceipt } from '../src/servicios/payment-receipts.js';

const imageUrl = process.argv[2];

if (!imageUrl) {
  console.error('❌ Falta URL de la imagen');
  console.log('\n📖 Uso:');
  console.log('  node scripts/test-payment-receipt.js <URL_IMAGEN>');
  console.log('\n💡 Ejemplo:');
  console.log('  node scripts/test-payment-receipt.js https://example.com/comprobante.jpg');
  console.log('\n📸 O sube la imagen a un servicio como:');
  console.log('  - https://imgur.com/');
  console.log('  - https://imgbb.com/');
  console.log('  - https://postimages.org/');
  process.exit(1);
}

console.log('🔍 Analizando comprobante...\n');
console.log('📸 URL:', imageUrl);
console.log('');

try {
  // 1. Analizar imagen con Vision API
  console.log('1️⃣ Extrayendo datos con Vision API...');
  const analysis = await analyzePaymentReceipt(imageUrl);
  
  console.log('\n📊 RESULTADO DEL ANÁLISIS:\n');
  console.log('✅ Éxito:', analysis.success);
  console.log('📋 Válido:', analysis.data?.isValid || false);
  console.log('🎯 Confianza:', analysis.data?.confidence || 0, '%');
  
  if (analysis.success && analysis.data) {
    console.log('\n💰 DATOS EXTRAÍDOS:\n');
    console.log('  Monto:', analysis.data.amount || 'No detectado');
    console.log('  Moneda:', analysis.data.currency || 'No detectado');
    console.log('  Fecha:', analysis.data.date || 'No detectado');
    console.log('  Hora:', analysis.data.time || 'No detectado');
    console.log('  Método:', analysis.data.paymentMethod || 'No detectado');
    console.log('  Banco:', analysis.data.bank || 'No detectado');
    console.log('  Referencia:', analysis.data.transactionNumber || 'No detectado');
    console.log('  Comprobante Nro.:', analysis.data.receiptNumber || 'No detectado');
    
    // 2. Generar mensaje de transcripción como lo vería el usuario
    const paidAmount = parseFloat(analysis.data.amount);
    
    console.log('\n📝 TRANSCRIPCIÓN PARA USUARIO:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const transcription = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $${paidAmount.toFixed(2)}
📅 Fecha: ${analysis.data.date || 'No detectada'}
💳 Método: ${analysis.data.paymentMethod || 'No especificado'}${analysis.data.bank ? ` - ${analysis.data.bank}` : ''}
${analysis.data.transactionNumber ? `🔢 Referencia: ${analysis.data.transactionNumber}` : ''}
${analysis.data.receiptNumber ? `📝 Comprobante: ${analysis.data.receiptNumber}` : ''}

¿Los datos son correctos?`;
    
    console.log(transcription);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 3. Simular validación contra monto esperado
    console.log('\n🔍 SIMULACIÓN DE VALIDACIÓN:\n');
    
    const expectedAmounts = [10, 20, 29, 49]; // Montos comunes
    expectedAmounts.forEach(expected => {
      const diff = Math.abs(paidAmount - expected);
      const isValid = diff <= 0.50;
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} Monto esperado $${expected} → Diferencia: $${diff.toFixed(2)} ${isValid ? '(VÁLIDO)' : '(RECHAZADO)'}`);
    });
    
    // 4. Casos de uso
    console.log('\n📋 CASOS DE USO:\n');
    
    if (paidAmount === 10) {
      console.log('  ✅ Hot Desk (1 persona)');
    } else if (paidAmount === 20) {
      console.log('  ✅ Hot Desk (2 personas)');
    } else if (paidAmount === 29) {
      console.log('  ✅ Sala de Reuniones');
    } else if (paidAmount === 49) {
      console.log('  ✅ Múltiples reservas (ej: Hot Desk x2 + Sala)');
    } else {
      console.log('  ⚠️  Monto no estándar - Requiere verificación manual');
    }
    
  } else {
    console.log('\n❌ ERROR:', analysis.error || 'No se pudo analizar');
  }
  
  console.log('\n✅ Prueba completada\n');
  
} catch (error) {
  console.error('\n❌ ERROR FATAL:\n');
  console.error('  Mensaje:', error.message);
  console.error('  Stack:', error.stack);
  process.exit(1);
}
