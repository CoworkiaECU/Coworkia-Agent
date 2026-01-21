// 📧 Test - Enviar recibo a Diego
import { sendPaymentReceipt } from '../../src/servicios/payment-receipt-email.js';

console.log('📧 Enviando recibo de prueba a Diego...\n');

const receiptData = {
  receiptNumber: 'REC-TEST-DIEGO-20260120',
  memberName: 'Francisco Zapata',
  memberEmail: 'yo@diegovillota.com',
  membershipType: 'Plan 20',
  totalAmount: 250,
  cashAmount: 100,
  canjeAmount: 150,
  canjeDescription: 'Producción de 2 videos profesionales mensuales',
  paymentDate: new Date().toISOString(),
  bankName: 'Produbanco',
  transactionReference: 'PROD-100-20260120-TEST',
  diegoAuthorized: true
};

console.log('📋 Datos del recibo:');
console.log('   - Para:', receiptData.memberEmail);
console.log('   - Cliente:', receiptData.memberName);
console.log('   - Membresía:', receiptData.membershipType);
console.log('   - Total:', `$${receiptData.totalAmount}`);
console.log('   - Efectivo:', `$${receiptData.cashAmount}`);
console.log('   - Canje:', `$${receiptData.canjeAmount}/mes`);
console.log('');

try {
  const result = await sendPaymentReceipt(receiptData);
  
  if (result.success) {
    console.log('✅ Recibo enviado exitosamente a yo@diegovillota.com');
    console.log('   - Message ID:', result.messageId);
    console.log('');
    console.log('📬 Revisa tu bandeja de entrada!');
  } else {
    console.log('❌ Error enviando:', result.error);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
