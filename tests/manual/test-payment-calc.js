/**
 * 🧪 Test de Cálculo de Pagos con Tarjeta
 * Verifica la fórmula: Base → +15% IVA → Subtotal → +5% comisión
 */

import { PartialReservationForm } from '../../src/servicios/partial-reservation-form.js';
import { calculateReservationCost } from '../../src/servicios/payment-calculator.js';

console.log('🧪 TESTS DE CÁLCULO DE PAGOS\n');

// ========================================
// TEST 1: Hot Desk con Tarjeta
// ========================================
console.log('📋 TEST 1: Hot Desk con Tarjeta');
const formHotDesk = new PartialReservationForm('+593987770788', { spaceType: 'hotDesk' });
formHotDesk.paymentMethod = 'tarjeta';
const hotDeskCalc = formHotDesk.calculateTotalWithTaxes();

console.log('   Cálculo:', hotDeskCalc);
// Fórmula: $10.00 → +$1.50 (15% IVA) = $11.50 → +$0.575 (5% comisión) = $12.08
if (hotDeskCalc.base === 10.00 && hotDeskCalc.iva === 1.50 && hotDeskCalc.cardFee === 0.58 && hotDeskCalc.total === 12.08) {
  console.log('✅ Hot Desk con Tarjeta: $10 + $1.50 IVA + $0.58 comisión = $12.08');
} else {
  console.log('❌ ERROR: Cálculo incorrecto');
  console.log(`   Esperado: base=10.00, iva=1.50, cardFee=0.58, total=12.08`);
  console.log(`   Recibido: base=${hotDeskCalc.base}, iva=${hotDeskCalc.iva}, cardFee=${hotDeskCalc.cardFee}, total=${hotDeskCalc.total}`);
  process.exit(1);
}

// ========================================
// TEST 2: Sala Reunión con Tarjeta
// ========================================
console.log('\n📋 TEST 2: Sala Reunión con Tarjeta');
const formMeeting = new PartialReservationForm('+593987770788', { spaceType: 'meetingRoom' });
formMeeting.paymentMethod = 'tarjeta';
const meetingCalc = formMeeting.calculateTotalWithTaxes();

console.log('   Cálculo:', meetingCalc);
// Fórmula: $29.00 → +$4.35 (15% IVA) = $33.35 → +$1.67 (5% comisión) = $35.02
if (meetingCalc.base === 29.00 && meetingCalc.iva === 4.35 && meetingCalc.cardFee === 1.67 && meetingCalc.total === 35.02) {
  console.log('✅ Sala Reunión con Tarjeta: $29 + $4.35 IVA + $1.67 comisión = $35.02');
} else {
  console.log('❌ ERROR: Cálculo incorrecto');
  console.log(`   Esperado: base=29.00, iva=4.35, cardFee=1.67, total=35.02`);
  console.log(`   Recibido: base=${meetingCalc.base}, iva=${meetingCalc.iva}, cardFee=${meetingCalc.cardFee}, total=${meetingCalc.total}`);
  process.exit(1);
}

// ========================================
// TEST 3: Hot Desk con Transferencia (sin comisión)
// ========================================
console.log('\n📋 TEST 3: Hot Desk con Transferencia');
const formTransfer = new PartialReservationForm('+593987770788', { spaceType: 'hotDesk' });
formTransfer.paymentMethod = 'transferencia';
const transferCalc = formTransfer.calculateTotalWithTaxes();

console.log('   Cálculo:', transferCalc);
// Fórmula: $10.00 → +$1.50 (15% IVA) = $11.50 (sin comisión)
if (transferCalc.base === 10.00 && transferCalc.iva === 1.50 && transferCalc.cardFee === 0 && transferCalc.total === 11.50) {
  console.log('✅ Transferencia: $10 + $1.50 IVA = $11.50 (sin comisión)');
} else {
  console.log('❌ ERROR: Cálculo incorrecto');
  console.log(`   Esperado: base=10.00, iva=1.50, cardFee=0, total=11.50`);
  console.log(`   Recibido: base=${transferCalc.base}, iva=${transferCalc.iva}, cardFee=${transferCalc.cardFee}, total=${transferCalc.total}`);
  process.exit(1);
}

// ========================================
// TEST 4: Payment Calculator (payment-calculator.js)
// ========================================
console.log('\n📋 TEST 4: Payment Calculator Module');
const calcHotDeskCard = calculateReservationCost('hotDesk', 2, 1, 'tarjeta');
console.log('   Cálculo payment-calculator.js:', calcHotDeskCard);

// Verificar que payment-calculator.js USA LA MISMA FÓRMULA
if (calcHotDeskCard.basePrice === 10.00 && 
    calcHotDeskCard.iva === 1.50 && 
    calcHotDeskCard.payphoneFee === 0.58 && 
    calcHotDeskCard.totalPrice === 12.08) {
  console.log('✅ payment-calculator.js: $10 + $1.50 IVA + $0.58 comisión = $12.08');
} else {
  console.log('❌ ERROR: payment-calculator.js tiene fórmula diferente');
  console.log(`   Esperado: base=10.00, iva=1.50, payphoneFee=0.58, total=12.08`);
  console.log(`   Recibido: base=${calcHotDeskCard.basePrice}, iva=${calcHotDeskCard.iva}, payphoneFee=${calcHotDeskCard.payphoneFee}, total=${calcHotDeskCard.totalPrice}`);
  process.exit(1);
}

console.log('\n✅ TODOS LOS TESTS PASARON CORRECTAMENTE\n');
console.log('📊 FÓRMULA VALIDADA:');
console.log('   Base → +15% IVA → Subtotal → +5% comisión proveedor');
console.log('   Hot Desk: $10 → $11.50 → $12.08');
console.log('   Sala Reunión: $29 → $33.35 → $35.02');
