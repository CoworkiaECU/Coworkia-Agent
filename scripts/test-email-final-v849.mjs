/**
 * 📧 TEST FINAL v849 — Email Aurora con todos los ajustes aplicados
 * 
 * CAMBIOS EN ESTA VERSIÓN:
 * - Código de reserva secuencial RES-2026-XXXX (nuevo sistema)
 * - Logo coworkia.png asset real (base64)
 * - Precio real Hot Desk $12.08 (con fee tarjeta)
 * - Código WiFi formato XXXX-XXXX (generado desde servicio)
 * - Background footer #12121a→#0d0d12
 * - Cards #16181d con glow permanente
 * - Agent order: aluna,enzo,angela,axel,adriana,gabi,paula,custom
 * - WiFi section step-by-step instructions
 * - Enlaces WhatsApp actualizados para todos los agentes
 */

import { sendReservationConfirmation } from '../src/servicios/email.js';

async function testFinalEmail() {
  console.log('\n🚀 TEST FINAL v849 — Email Aurora completo\n');
  console.log('━'.repeat(60));

  // Código WiFi de ejemplo en formato hiphenado correcto
  const wifiCode = 'SDWA-SKVU'; // Formato real XXXX-XXXX
  console.log(`✅ Usando código WiFi ejemplo: ${wifiCode} (formato hiphenado)`);

  // 2. Enviar email con precio REAL
  const result = await sendReservationConfirmation({
    email: 'coworkia.ec@gmail.com',
    userName: 'Diego Villota — TEST FINAL v849 🎯',
    date: '2026-01-15',
    startTime: '14:00',
    endTime: '16:00',
    durationHours: 2,
    serviceType: 'hotDesk',
    totalPrice: 12.08, // PRECIO REAL con fee de tarjeta (20.8%)
    wifiCode: wifiCode, // Código REAL formato XXXX-XXXX
    paymentReceipt: {
      method: 'Tarjeta de crédito/débito Payphone',
      reference: 'PAY-FINAL-V849-2026',
      amount: 12.08,
      timestamp: new Date().toISOString()
    },
    reservation: {
      id: 'RES-WHY-2026-0001' // Código secuencial de reserva con sucursal (nuevo formato)
    }
  });

  if (result.success) {
    console.log('\n✅ EMAIL ENVIADO EXITOSAMENTE\n');
    console.log('📬 Message ID:', result.messageId);
    console.log('📧 Destinatario:', 'coworkia.ec@gmail.com');
    console.log('� Código Reserva: RES-WHY-2026-0001');
    console.log('💰 Monto:', '$12.08 USD (Hot Desk + fee tarjeta)');
    console.log('📶 Código WiFi:', wifiCode, '(hiphenado)');
    console.log('\n🎨 VERIFICAR EN EMAIL:');
    console.log('  1. Código de reserva RES-WHY-2026-0001 visible');
    console.log('  2. Logo coworkia.png (laptop+cup) correcto');
    console.log('  3. Precio $12.08 aparece');
    console.log('  4. Código WiFi formato XXXX-XXXX');
    console.log('  5. Sección WiFi con pasos 1,2,3');
    console.log('  6. Footer background oscuro (#12121a→#0d0d12)');
    console.log('  7. Cards con glow de colores (#16181d)');
    console.log('  8. Orden agentes: aluna,enzo,angela,axel,adriana,gabi,paula,custom');
    console.log('  9. Agente custom "El próximo agente es el tuyo"');
  } else {
    console.error('\n❌ ERROR AL ENVIAR EMAIL\n');
    console.error(result.error);
    process.exit(1);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✨ Test completado — Revisar inbox coworkia.ec@gmail.com\n');
}

testFinalEmail();
