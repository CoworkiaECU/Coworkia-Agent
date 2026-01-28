#!/usr/bin/env node
/**
 * 📧 TEST MASIVO: Emails de todos los agentes
 * Envía emails de prueba a múltiples destinatarios
 */

import { sendReservationConfirmation } from './src/servicios/email.js';
import { sendQuoteEmail } from './src/servicios/axel-quote-email.js';

const EMAILS = [
  'dot.andres97@gmail.com',
  'osalgadoe@gmail.com',
  'pajoti84@gmail.com',
  'jcastrojurist@hotmail.com'
];

console.log('\n📧 TEST MASIVO: Emails de Agentes');
console.log('═'.repeat(60));
console.log(`📬 Enviando a ${EMAILS.length} destinatarios\n`);

async function sendToEmail(email) {
  console.log(`\n📩 Enviando a: ${email}`);
  console.log('─'.repeat(60));
  
  let success = 0;
  let failed = 0;

  // 1. AURORA - Confirmación de reserva Hot Desk
  try {
    console.log('  1️⃣  AURORA - Confirmación de reserva...');
    await sendReservationConfirmation({
      email: email,
      userName: 'Cliente Test',
      date: '2026-02-15',
      startTime: '09:00',
      endTime: '13:00',
      durationHours: 4,
      serviceType: 'Hot Desk',
      wasFree: false,
      totalPrice: 15,
      reservation: {
        id: 'TEST-' + Date.now(),
        date: '2026-02-15',
        startTime: '09:00',
        endTime: '13:00',
        paymentMethod: 'Transferencia bancaria'
      }
    });
    console.log('      ✅ Enviado\n');
    success++;
  } catch (error) {
    console.error('      ❌ Error:', error.message, '\n');
    failed++;
  }

  // 2. AXEL - Cotización de reparación
  try {
    console.log('  2️⃣  AXEL - Cotización de reparación...');
    await sendQuoteEmail({
      customerName: 'Cliente Test',
      customerEmail: email,
      customerPhone: '+593987770788',
      vehicleInfo: 'Toyota Corolla 2020 - ABC-1234',
      damageDescription: 'Golpe en puerta lateral derecha',
      estimatedCost: 280,
      estimatedDays: '3-5 días',
      additionalNotes: 'Incluye pintura y mano de obra'
    });
    console.log('      ✅ Enviado\n');
    success++;
  } catch (error) {
    console.error('      ❌ Error:', error.message, '\n');
    failed++;
  }

  // 3. ALUNA - Solicitud de membresía
  console.log('  3️⃣  ALUNA - Solicitud de membresía...');
  console.log('      ⚠️  No implementado (simulado)\n');
  // No hay función sendMembershipLeadEmail disponible

  // 4. GABI - Recibo de pago
  console.log('  4️⃣  GABI - Recibo de pago...');
  console.log('      ⚠️  No implementado (simulado)\n');
  // Función sendPaymentReceiptEmail no disponible

  // 5-6. ENZO, PAULA, ADRIANA - Simulados (no implementados)
  console.log('  5️⃣  ENZO - Email de cotización IA');
  console.log('      ⚠️  No implementado (simulado)\n');
  
  console.log('  6️⃣  PAULA - Email de confirmación de visita');
  console.log('      ⚠️  No implementado (simulado)\n');
  
  console.log('  7️⃣  ADRIANA - Email de cotización de seguros');
  console.log('      ⚠️  No implementado (simulado)\n');

  console.log(`  Resultado: ✅ ${success} enviados | ❌ ${failed} fallidos | ⚠️ 5 simulados`);
  console.log('─'.repeat(60));
  
  return { success, failed };
}

// Ejecutar para todos los emails
(async () => {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const email of EMAILS) {
    const result = await sendToEmail(email);
    totalSuccess += result.success;
    totalFailed += result.failed;
    
    // Delay entre destinatarios para no sobrecargar
    if (EMAILS.indexOf(email) < EMAILS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n═'.repeat(60));
  console.log('📊 RESUMEN FINAL');
  console.log('═'.repeat(60));
  console.log(`✅ Total enviados: ${totalSuccess}`);
  console.log(`❌ Total fallidos: ${totalFailed}`);
  console.log(`📬 Destinatarios: ${EMAILS.length}`);
  console.log(`📧 Emails por destinatario: 2 (Aurora, Axel)`);
  console.log('═'.repeat(60) + '\n');
})();
