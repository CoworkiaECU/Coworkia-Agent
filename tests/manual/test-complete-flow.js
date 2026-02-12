/**
 * 🧪 Test Completo del Flujo de Reservas
 * Valida todas las funciones críticas antes de iniciar pruebas reales
 */

import { PartialReservationForm, extractDataFromMessage } from '../../src/servicios/partial-reservation-form.js';
import { detectCampaignMessage, personalizeCampaignResponse } from '../../src/servicios/campaign-prompts.js';

console.log('🧪 INICIANDO TESTS DE VALIDACIÓN\n');

// ========================================
// TEST 1: Detección de Campañas
// ========================================
console.log('📋 TEST 1: Detección de Campañas');
const testCampaign = detectCampaignMessage('quiero probar el servicio');
if (testCampaign.detected) {
  console.log('✅ Campaña detectada correctamente:', testCampaign.campaign);
} else {
  console.log('❌ ERROR: No se detectó la campaña');
  process.exit(1);
}

// ========================================
// TEST 2: Respuesta para Cliente Nuevo
// ========================================
console.log('\n📋 TEST 2: Respuesta Cliente Nuevo');
const newClientProfile = {
  name: 'Diego Villota',
  firstVisit: true,
  freeTrialUsed: false,
  reservationHistory: []
};
const newClientResponse = personalizeCampaignResponse(testCampaign.template, newClientProfile);
if (newClientResponse.includes('2 horas gratis')) {
  console.log('✅ Cliente nuevo: ofrece trial gratis');
} else {
  console.log('❌ ERROR: Cliente nuevo no recibe trial gratis');
  console.log('Respuesta:', newClientResponse);
  process.exit(1);
}

// ========================================
// TEST 3: Respuesta para Cliente Recurrente
// ========================================
console.log('\n📋 TEST 3: Respuesta Cliente Recurrente');
const recurringProfile = {
  name: 'Diego Villota',
  firstVisit: false,
  freeTrialUsed: false,
  reservationHistory: []
};
const recurringResponse = personalizeCampaignResponse(testCampaign.template, recurringProfile);
if (recurringResponse.includes('cliente recurrente') && recurringResponse.includes('$10') && recurringResponse.includes('$29')) {
  console.log('✅ Cliente recurrente: muestra precios');
} else {
  console.log('❌ ERROR: Cliente recurrente no recibe mensaje correcto');
  console.log('Respuesta:', recurringResponse);
  process.exit(1);
}

// ========================================
// TEST 4: Formulario - Cálculo Base Price
// ========================================
console.log('\n📋 TEST 4: Cálculo Precio Base');
const formHotDesk = new PartialReservationForm('+593987770788', { spaceType: 'hotDesk' });
const basePrice = formHotDesk.getBasePrice();
if (basePrice === 10) {
  console.log('✅ Hot Desk precio base: $10');
} else {
  console.log('❌ ERROR: Hot Desk precio incorrecto:', basePrice);
  process.exit(1);
}

const formMeetingRoom = new PartialReservationForm('+593987770788', { spaceType: 'meetingRoom' });
const meetingPrice = formMeetingRoom.getBasePrice();
if (meetingPrice === 29) {
  console.log('✅ Sala Reuniones precio base: $29');
} else {
  console.log('❌ ERROR: Sala Reuniones precio incorrecto:', meetingPrice);
  process.exit(1);
}

// ========================================
// TEST 5: Cálculo Impuestos - Transferencia
// ========================================
console.log('\n📋 TEST 5: Impuestos Transferencia');
formHotDesk.paymentMethod = 'transferencia';
const transferCalc = formHotDesk.calculateTotalWithTaxes();
if (transferCalc.total === 11.50 && transferCalc.taxes.iva === 1.50) {
  console.log('✅ Transferencia: $10 + 15% IVA = $11.50');
} else {
  console.log('❌ ERROR: Cálculo transferencia incorrecto:', transferCalc);
  process.exit(1);
}

// ========================================
// TEST 6: Cálculo Impuestos - Tarjeta
// ========================================
console.log('\n📋 TEST 6: Impuestos Tarjeta');
formHotDesk.paymentMethod = 'tarjeta';
const cardCalc = formHotDesk.calculateTotalWithTaxes();
// Fórmula: $10 → +15% IVA = $11.50 → +5% comisión = $12.08
if (cardCalc.total === 12.08 && cardCalc.cardFee === 0.58 && cardCalc.iva === 1.50) {
  console.log('✅ Tarjeta: $10 + 15% IVA = $11.50 + 5% comisión = $12.08');
} else {
  console.log('❌ ERROR: Cálculo tarjeta incorrecto:', cardCalc);
  console.log(`   Esperado: total=12.08, cardFee=0.58, iva=1.50`);
  console.log(`   Recibido: total=${cardCalc.total}, cardFee=${cardCalc.cardFee}, iva=${cardCalc.iva}`);
  process.exit(1);
}

// ========================================
// TEST 7: Detección Método de Pago
// ========================================
console.log('\n📋 TEST 7: Detección Método de Pago');
const formBlank = new PartialReservationForm('+593987770788');
const updates1 = extractDataFromMessage('quiero pagar con tarjeta', formBlank);
if (updates1.paymentMethod === 'tarjeta') {
  console.log('✅ Detecta: tarjeta');
} else {
  console.log('❌ ERROR: No detecta tarjeta');
  process.exit(1);
}

const updates2 = extractDataFromMessage('transferencia bancaria', formBlank);
if (updates2.paymentMethod === 'transferencia') {
  console.log('✅ Detecta: transferencia');
} else {
  console.log('❌ ERROR: No detecta transferencia');
  process.exit(1);
}

// ========================================
// TEST 8: Detección de Espacio
// ========================================
console.log('\n📋 TEST 8: Detección de Espacio');
const updates3 = extractDataFromMessage('quiero un hot desk', formBlank);
if (updates3.spaceType === 'hotDesk') {
  console.log('✅ Detecta: Hot Desk');
} else {
  console.log('❌ ERROR: No detecta Hot Desk');
  process.exit(1);
}

const updates4 = extractDataFromMessage('necesito sala de reuniones', formBlank);
if (updates4.spaceType === 'meetingRoom') {
  console.log('✅ Detecta: Sala Reuniones');
} else {
  console.log('❌ ERROR: No detecta Sala Reuniones');
  process.exit(1);
}

// ========================================
// TEST 9: Detección de Personas
// ========================================
console.log('\n📋 TEST 9: Detección Número de Personas');
const updates5 = extractDataFromMessage('somos 4 personas', formBlank);
if (updates5.numPeople === 4) {
  console.log('✅ Detecta: 4 personas');
} else {
  console.log('❌ ERROR: No detecta 4 personas, detectó:', updates5.numPeople);
  process.exit(1);
}

const updates6 = extractDataFromMessage('yo y 3 más', formBlank);
if (updates6.numPeople === 4) {
  console.log('✅ Detecta: yo y 3 más = 4 personas');
} else {
  console.log('❌ ERROR: "yo y 3 más" no suma correctamente, detectó:', updates6.numPeople);
  process.exit(1);
}

// ========================================
// TEST 10: getMissingFields con paymentMethod
// ========================================
console.log('\n📋 TEST 10: Campos Faltantes incluyen paymentMethod');
const formPartial = new PartialReservationForm('+593987770788', {
  spaceType: 'hotDesk',
  date: '2025-11-18',
  time: '10:00',
  email: 'test@test.com'
});
const missing = formPartial.getMissingFields();
if (missing.includes('paymentMethod')) {
  console.log('✅ paymentMethod está en campos faltantes');
} else {
  console.log('❌ ERROR: paymentMethod NO está en campos faltantes');
  console.log('Faltantes:', missing);
  process.exit(1);
}

// ========================================
// RESULTADO FINAL
// ========================================
console.log('\n' + '='.repeat(50));
console.log('✅✅✅ TODOS LOS TESTS PASARON EXITOSAMENTE ✅✅✅');
console.log('='.repeat(50));
console.log('\n🚀 Sistema listo para pruebas reales\n');
