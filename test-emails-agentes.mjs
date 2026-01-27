/**
 * TEST: Envío de emails por agente
 * Simula interacciones completas que disparan emails reales
 * 
 * Agentes: Aurora, Enzo, Axel, Paula, Gabi, Adriana
 */

import { sendReservationEmail } from './src/servicios/reservation-email.js';
import { sendQuoteEmail } from './src/servicios/axel-quote-email.js';

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

console.log('\n📧 TEST: Emails de Agentes\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📬 Email destino: ${TEST_EMAIL}\n`);

// ════════════════════════════════════════════════════════════
// 1. AURORA - Confirmación de Reserva
// ════════════════════════════════════════════════════════════
async function testAuroraEmail() {
  console.log('1️⃣  AURORA - Reserva de Hot Desk\n');
  
  const reservationData = {
    userName: 'Cliente Test',
    userEmail: TEST_EMAIL,
    date: '2026-02-15',
    startTime: '09:00',
    endTime: '13:00',
    duration: 4,
    spaceType: 'hot_desk',
    spaceName: 'Hot Desk 1',
    price: 15,
    paymentMethod: 'Transferencia bancaria',
    additionalNotes: 'Prueba de email desde sistema automatizado'
  };

  try {
    await sendReservationEmail(reservationData);
    console.log('   ✅ Email enviado: Confirmación de reserva\n');
  } catch (error) {
    console.error('   ❌ Error:', error.message, '\n');
  }
}

// ════════════════════════════════════════════════════════════
// 2. ENZO - Cotización IA
// ════════════════════════════════════════════════════════════
async function testEnzoEmail() {
  console.log('2️⃣  ENZO - Cotización Sistema IA\n');
  
  const quoteData = {
    clientName: 'Cliente Test',
    clientEmail: TEST_EMAIL,
    companyName: 'Empresa Demo S.A.',
    industry: 'Servicios',
    service: 'Sistema IA Completo',
    features: [
      'Agente virtual 24/7',
      'Integración WhatsApp',
      'Dashboard analytics',
      'Multiidioma (ES/EN/FR)'
    ],
    price: 850,
    setupFee: 350,
    implementationTime: '2-3 semanas',
    notes: 'Cotización generada automáticamente por sistema de prueba'
  };

  console.log('   📊 Detalles:', {
    servicio: quoteData.service,
    precio: `$${quoteData.price}/mes`,
    setup: `$${quoteData.setupFee}`,
    tiempo: quoteData.implementationTime
  });

  // Enzo usa email manual - simulamos envío
  console.log('   ✅ Email simulado: Cotización IA personalizada\n');
}

// ════════════════════════════════════════════════════════════
// 3. AXEL - Cotización Reparación Vehicular
// ════════════════════════════════════════════════════════════
async function testAxelEmail() {
  console.log('3️⃣  AXEL - Cotización Reparación\n');
  
  const quoteData = {
    quoteCode: `PB-${Date.now()}`,
    clientName: 'Cliente Test',
    clientEmail: TEST_EMAIL,
    clientPhone: '+593987770788',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2020,
    damageType: 'Rayón lateral',
    damageDescription: 'Rayón profundo en puerta lateral derecha',
    estimatedCost: 280,
    estimatedDays: '3-5 días',
    partsNeeded: [
      'Pintura automotriz',
      'Barniz UV',
      'Masilla de relleno'
    ],
    laborCost: 150,
    partsCost: 130,
    includesWarranty: true,
    warrantyMonths: 6,
    photos: 2
  };

  try {
    await sendQuoteEmail(quoteData);
    console.log('   ✅ Email enviado: Cotización reparación vehicular\n');
  } catch (error) {
    console.error('   ❌ Error:', error.message, '\n');
  }
}

// ════════════════════════════════════════════════════════════
// 4. PAULA - Confirmación Tour Propiedad
// ════════════════════════════════════════════════════════════
async function testPaulaEmail() {
  console.log('4️⃣  PAULA - Confirmación Tour\n');
  
  const tourData = {
    clientName: 'Cliente Test',
    clientEmail: TEST_EMAIL,
    clientPhone: '+593987770788',
    propertyCode: 'EC-QTO-CYA-001',
    propertyName: 'Casa Jardín Premium',
    propertyAddress: 'Cumbayá, Quito, Ecuador',
    propertyType: 'Casa',
    price: 185000,
    tourDate: '2026-02-20',
    tourTime: '10:00 AM',
    features: [
      '3 habitaciones',
      '2.5 baños',
      'Jardín 150m²',
      'Garaje 2 autos',
      'Urbanización cerrada'
    ]
  };

  console.log('   🏡 Detalles:', {
    propiedad: tourData.propertyName,
    ubicacion: tourData.propertyAddress,
    precio: `$${tourData.price.toLocaleString()}`,
    fecha: `${tourData.tourDate} ${tourData.tourTime}`
  });

  // Paula usa email manual - simulamos envío
  console.log('   ✅ Email simulado: Confirmación de tour inmobiliario\n');
}

// ════════════════════════════════════════════════════════════
// 5. GABI - Comprobante Pago Membresía
// ════════════════════════════════════════════════════════════
async function testGabiEmail() {
  console.log('5️⃣  GABI - Comprobante Pago Membresía\n');
  
  const receiptData = {
    clientName: 'Cliente Test',
    clientEmail: TEST_EMAIL,
    membershipPlan: 'Plan 20 Horas',
    amount: 220,
    paymentMethod: 'Transferencia bancaria',
    paymentDate: new Date().toISOString().split('T')[0],
    invoiceNumber: `INV-${Date.now()}`,
    nextPaymentDue: '2026-02-27',
    hoursIncluded: 20,
    validity: '30 días',
    benefits: [
      '20 horas de coworking',
      'Acceso salas de reuniones',
      'Café y snacks incluidos',
      'Internet de alta velocidad',
      'Estacionamiento'
    ]
  };

  console.log('   💳 Detalles:', {
    plan: receiptData.membershipPlan,
    monto: `$${receiptData.amount}`,
    factura: receiptData.invoiceNumber,
    validez: receiptData.validity
  });

  // Gabi usa email manual - simulamos envío
  console.log('   ✅ Email simulado: Comprobante de pago procesado\n');
}

// ════════════════════════════════════════════════════════════
// 6. ADRIANA - Cotización Seguro
// ════════════════════════════════════════════════════════════
async function testAdrianaEmail() {
  console.log('6️⃣  ADRIANA - Cotización Seguro\n');
  
  const insuranceData = {
    clientName: 'Cliente Test',
    clientEmail: TEST_EMAIL,
    clientPhone: '+593987770788',
    insuranceType: 'Seguro de Vida',
    coverage: 50000,
    monthlyPremium: 45,
    benefits: [
      'Cobertura por muerte natural',
      'Cobertura por accidente',
      'Invalidez total permanente',
      'Enfermedades graves',
      'Asistencia médica 24/7'
    ],
    deductible: 0,
    waitingPeriod: '30 días',
    age: 35,
    healthStatus: 'Saludable',
    validityYears: 1,
    renewalAutomatic: true
  };

  console.log('   🛡️  Detalles:', {
    tipo: insuranceData.insuranceType,
    cobertura: `$${insuranceData.coverage.toLocaleString()}`,
    prima: `$${insuranceData.monthlyPremium}/mes`,
    edad: insuranceData.age
  });

  // Adriana usa email manual - simulamos envío
  console.log('   ✅ Email simulado: Cotización de seguro personalizada\n');
}

// ════════════════════════════════════════════════════════════
// EJECUTAR TODOS LOS TESTS
// ════════════════════════════════════════════════════════════
async function runAllTests() {
  console.log('🚀 Iniciando prueba de emails...\n');
  
  await testAuroraEmail();
  await testEnzoEmail();
  await testAxelEmail();
  await testPaulaEmail();
  await testGabiEmail();
  await testAdrianaEmail();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TEST COMPLETADO\n');
  console.log(`📬 Revisa ${TEST_EMAIL} para emails de:`);
  console.log('   • Aurora (reserva confirmada)');
  console.log('   • Axel (cotización reparación)');
  console.log('\n📝 Emails simulados (requieren implementación):');
  console.log('   • Enzo (cotización IA)');
  console.log('   • Paula (tour propiedad)');
  console.log('   • Gabi (comprobante pago)');
  console.log('   • Adriana (cotización seguro)\n');
}

// Ejecutar
runAllTests().catch(console.error);
