/**
 * 🧪 TEST AURORA EMAIL v849 — Logo blanco, WiFi REAL, 8vo agente, fondo oscuro
 */

import { sendReservationConfirmation } from './src/servicios/email.js';

async function testAuroraEmail() {
  console.log('🚀 Enviando email de prueba Aurora v849...\n');
  
  const testReservationId = `TEST-V849-${Date.now()}`;
  
  // Código WiFi formato real (4 caracteres alfanuméricos)
  const realWifiCode = 'HW7B'; // Código en formato real del sistema
  
  console.log(`✅ Código WiFi de prueba: ${realWifiCode}\n`);
  console.log('📧 Enviando email con diseño final v849...\n');
  
  const reservationData = {
    email: 'coworkia.ec@gmail.com',
    userName: 'Diego Villota — PRUEBA FINAL v849 REAL',
    date: '2026-03-15',
    startTime: '14:00',
    endTime: '16:00',
    durationHours: 2,
    serviceType: 'Hot Desk',
    wasFree: false,
    totalPrice: 25,
    
    reservation: {
      id: testReservationId
    },
    
    // Código WiFi REAL formato sistema (4 chars)
    wifiCode: realWifiCode,
    
    // Recibo de pago simulado
    paymentReceipt: {
      method: 'Payphone',
      reference: 'PAY-TEST-849-2026',
      date: '2026-03-09',
      amount: 25
    }
  };

  try {
    const result = await sendReservationConfirmation(reservationData);
    
    if (result.success) {
      console.log('\n✅ EMAIL ENVIADO EXITOSAMENTE');
      console.log('📧 Destinatario: coworkia.ec@gmail.com');
      console.log('📋 ID del mensaje:', result.messageId);
      console.log('\n🔍 VERIFICA:');
      console.log('  ✓ Logo BLANCO SVG en header turquesa');
      console.log(`  ✓ Sección WiFi completa con código REAL: ${realWifiCode}`);
      console.log('  ✓ Remitente: "Aurora • Reservas Coworkia Business Center"');
      console.log('  ✓ Footer OSCURO (#0a0a0a → #050505) como página web');
      console.log('  ✓ 8 agentes: Aluna primera + 8vo recuadro CUSTOM "El próximo agente es el tuyo"');
      console.log('  ✓ CTAs mejorados: "Reparar mi auto", "Quiero médico virtual", etc');
      console.log('  ✓ Efecto glow mejorado con onmouseover inline');
      console.log('  ✓ Angela corregida: "obsequios de salud para fidelidad"');
    } else {
      console.error('\n❌ ERROR enviando email:', result.error);
    }
  } catch (error) {
    console.error('\n❌ EXCEPCIÓN:', error.message);
    console.error(error.stack);
  }
}

testAuroraEmail();
