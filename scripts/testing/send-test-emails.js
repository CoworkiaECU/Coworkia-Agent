#!/usr/bin/env node
/**
 * 📧 Script para enviar emails de prueba
 * Aurora, Aluna y Gabi
 */

import { sendReservationEmail } from '../../src/servicios/email.js';
import { sendMembershipLeadEmail } from '../../src/servicios/generic-email-templates.js';

const TEST_EMAIL = 'yo@diegovillota.com';
const TEST_USER = 'Diego Villota';

async function sendTestEmails() {
  console.log('📧 ════════════════════════════════════════════════');
  console.log('   ENVIANDO EMAILS DE PRUEBA');
  console.log('════════════════════════════════════════════════\n');

  // 1. AURORA - Email de confirmación de reserva
  console.log('🌅 1. AURORA - Email de confirmación de reserva');
  console.log('─'.repeat(50));
  try {
    const auroraResult = await sendReservationEmail({
      email: TEST_EMAIL,
      userName: TEST_USER,
      reservationDetails: {
        date: '2026-01-25',
        startTime: '09:00',
        endTime: '13:00',
        spaceType: 'Hot Desk',
        totalPrice: 15,
        paymentMethod: 'Transferencia',
        benefits: '• WiFi de alta velocidad\n• Café y té ilimitado\n• Acceso a salas de reunión',
        wasFree: false
      }
    });
    
    if (auroraResult.success) {
      console.log('✅ Email de Aurora enviado exitosamente');
      console.log(`   MessageId: ${auroraResult.messageId}\n`);
    } else {
      console.error('❌ Error enviando email de Aurora:', auroraResult.error);
    }
  } catch (error) {
    console.error('❌ Excepción en Aurora:', error.message);
  }

  // 2. ALUNA - Email de solicitud de membresía
  console.log('🌙 2. ALUNA - Email de solicitud de membresía');
  console.log('─'.repeat(50));
  try {
    const alunaResult = await sendMembershipLeadEmail({
      userName: TEST_USER,
      userEmail: TEST_EMAIL,
      userPhone: '+593987770788',
      membershipType: 'Plan 10 - Medio Tiempo',
      startDate: '2026-02-01',
      companyName: 'Coworkia Test',
      additionalNotes: 'Email de prueba para verificar nuevo branding Business Center'
    });
    
    if (alunaResult.success) {
      console.log('✅ Email de Aluna enviado exitosamente');
      console.log(`   MessageId: ${alunaResult.messageId}\n`);
    } else {
      console.error('❌ Error enviando email de Aluna:', alunaResult.error);
    }
  } catch (error) {
    console.error('❌ Excepción en Aluna:', error.message);
  }

  // 3. GABI - Email usando generic template (payment receipt)
  console.log('👔 3. GABI - Email de recibo de pago');
  console.log('─'.repeat(50));
  try {
    // Importar función de payment receipt
    const { sendPaymentReceiptEmail } = await import('../../src/servicios/payment-receipt-email.js');
    
    const gabiResult = await sendPaymentReceiptEmail({
      userName: TEST_USER,
      userEmail: TEST_EMAIL,
      reservationDetails: {
        date: '2026-01-25',
        startTime: '14:00',
        endTime: '18:00',
        spaceType: 'Sala de Reuniones',
        totalPrice: 40,
        paymentMethod: 'Transferencia',
        benefits: '• Sala privada con proyector\n• WiFi de alta velocidad\n• Coffee break incluido',
        wasFree: false
      },
      paymentVerification: {
        verified: true,
        amount: 40,
        reference: 'TEST-' + Date.now()
      }
    });
    
    if (gabiResult.success) {
      console.log('✅ Email de Gabi enviado exitosamente');
      console.log(`   MessageId: ${gabiResult.messageId}\n`);
    } else {
      console.error('❌ Error enviando email de Gabi:', gabiResult.error);
    }
  } catch (error) {
    console.error('❌ Excepción en Gabi:', error.message);
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('✅ PROCESO COMPLETADO');
  console.log(`📬 Revisa tu inbox: ${TEST_EMAIL}`);
  console.log('════════════════════════════════════════════════\n');
}

// Ejecutar
sendTestEmails().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
