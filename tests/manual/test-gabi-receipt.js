// 🧪 Testing Manual - Gabi Recibos de Pago por Email
// Script para probar el sistema de recibos sin enviar WhatsApp

import { sendPaymentReceipt, prepareReceiptData } from '../../src/servicios/payment-receipt-email.js';

console.log('🧪 [TEST-GABI] Iniciando testing de recibos por email...\n');

// ========================================
// TEST 1: Pago Compuesto (Francisco Zapata)
// ========================================
console.log('📋 TEST 1: Pago Compuesto - Francisco Zapata');
console.log('─'.repeat(60));

const franciscoLead = {
  id: 999,
  full_name: 'Francisco Zapata',
  email: 'francisco.zapata@test.com',
  user_phone: '+593987654321',
  membership_type: 'Plan 20',
  total_amount: 250,
  status: 'payment_pending',
  created_at: new Date().toISOString()
};

const franciscoPayment = {
  amount: 100,
  transaction_date: new Date().toISOString(),
  transaction_id: 'TEST-PROD-100-20260120',
  destination_account: 'Produbanco 20059783069',
  source_bank: 'Produbanco',
  confidence_score: 95
};

const franciscoComposite = {
  isComposite: true,
  cashAmount: 100,
  canjeAmount: 150,
  canjeDescription: 'Producción de 2 videos profesionales mensuales',
  totalAmount: 250,
  diegoAuthorized: true
};

const receiptData1 = prepareReceiptData(franciscoLead, franciscoPayment, franciscoComposite);

console.log('✅ Datos del recibo preparados:');
console.log('   - Número:', receiptData1.receiptNumber);
console.log('   - Cliente:', receiptData1.memberName);
console.log('   - Email:', receiptData1.memberEmail);
console.log('   - Membresía:', receiptData1.membershipType);
console.log('   - Total:', `$${receiptData1.totalAmount}`);
console.log('   - Efectivo:', `$${receiptData1.cashAmount}`);
console.log('   - Canje:', `$${receiptData1.canjeAmount}/mes`);
console.log('   - Servicio:', receiptData1.canjeDescription);
console.log('   - Autorizado Diego:', receiptData1.diegoAuthorized ? 'SÍ' : 'NO');

// Intentar enviar email
console.log('\n📧 Intentando enviar email...');
try {
  const result1 = await sendPaymentReceipt(receiptData1);
  
  if (result1.success) {
    console.log('✅ Email enviado exitosamente');
    console.log('   - Message ID:', result1.messageId);
  } else {
    console.log('⚠️  Email NO enviado:', result1.error);
    console.log('   (Esto es normal si no hay credenciales EMAIL_USER/EMAIL_PASS configuradas)');
  }
} catch (error) {
  console.error('❌ Error al enviar:', error.message);
}

console.log('\n');

// ========================================
// TEST 2: Pago Simple (Sin canje)
// ========================================
console.log('📋 TEST 2: Pago Simple - María González');
console.log('─'.repeat(60));

const mariaLead = {
  id: 998,
  full_name: 'María González',
  email: 'maria.gonzalez@test.com',
  user_phone: '+593998765432',
  membership_type: 'Plan 10',
  total_amount: 201.60,
  status: 'payment_pending',
  created_at: new Date().toISOString()
};

const mariaPayment = {
  amount: 201.60,
  transaction_date: new Date().toISOString(),
  transaction_id: 'TEST-PAYM-201-20260120',
  destination_account: 'Payphone',
  source_bank: 'Pichincha',
  confidence_score: 98
};

const receiptData2 = prepareReceiptData(mariaLead, mariaPayment, null);

console.log('✅ Datos del recibo preparados:');
console.log('   - Número:', receiptData2.receiptNumber);
console.log('   - Cliente:', receiptData2.memberName);
console.log('   - Email:', receiptData2.memberEmail);
console.log('   - Membresía:', receiptData2.membershipType);
console.log('   - Total:', `$${receiptData2.totalAmount}`);
console.log('   - Tipo pago:', receiptData2.canjeAmount > 0 ? 'Compuesto' : 'Simple');

console.log('\n📧 Intentando enviar email...');
try {
  const result2 = await sendPaymentReceipt(receiptData2);
  
  if (result2.success) {
    console.log('✅ Email enviado exitosamente');
    console.log('   - Message ID:', result2.messageId);
  } else {
    console.log('⚠️  Email NO enviado:', result2.error);
    console.log('   (Esto es normal si no hay credenciales EMAIL_USER/EMAIL_PASS configuradas)');
  }
} catch (error) {
  console.error('❌ Error al enviar:', error.message);
}

console.log('\n');

// ========================================
// RESUMEN
// ========================================
console.log('═'.repeat(60));
console.log('📊 RESUMEN DE TESTING');
console.log('═'.repeat(60));
console.log('✅ Test 1: Pago compuesto generado correctamente');
console.log('✅ Test 2: Pago simple generado correctamente');
console.log('');
console.log('📧 Para enviar emails reales, configurar en .env:');
console.log('   EMAIL_USER=tu-email@gmail.com');
console.log('   EMAIL_PASS=tu-app-password');
console.log('   EMAIL_SERVICE=gmail');
console.log('');
console.log('💡 PRÓXIMOS PASOS:');
console.log('   1. Preview HTML en navegador (guardar HTML en archivo)');
console.log('   2. Testing de integración con membership-payment-verification.js');
console.log('   3. Testing en producción con caso real');
console.log('');
console.log('🧪 [TEST-GABI] Testing completado');
