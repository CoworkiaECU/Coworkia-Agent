/**
 * 📧 TEST MASIVO DE EMAILS - 6 AGENTES
 * Simula interacciones reales que disparan emails automáticos
 * 
 * Agentes incluidos:
 * - Aurora: Reserva confirmada
 * - Enzo: Cotización proyecto IA
 * - Axel: Cotización reparación vehicular
 * - Paula: Tour propiedad agendado
 * - Gabi: Pago membresía procesado
 * - Adriana: Cotización seguro
 */

import { generateEmailForAgent } from './src/servicios/generic-email-templates.js';
import { sendEmail } from './src/servicios/email.js';
import { sendQuoteEmail } from './src/servicios/axel-quote-email.js';

// ⚠️ CONFIGURAR ANTES DE EJECUTAR
const DESTINATION_EMAIL = 'TU_EMAIL_AQUI@example.com'; // 👈 Reemplazar con email real

console.log('\n📧 TEST MASIVO DE EMAILS - 6 AGENTES');
console.log('═══════════════════════════════════════════════════\n');
console.log(`📬 Destinatario: ${DESTINATION_EMAIL}`);

if (DESTINATION_EMAIL === 'TU_EMAIL_AQUI@example.com') {
  console.error('\n❌ ERROR: Debes configurar DESTINATION_EMAIL antes de ejecutar');
  console.log('   Edita la línea 17 con tu email real\n');
  process.exit(1);
}

let successCount = 0;
let failCount = 0;

// ═══════════════════════════════════════════════════════════════
// 1️⃣ AURORA - Reserva Hot Desk Confirmada
// ═══════════════════════════════════════════════════════════════
async function testAuroraEmail() {
  console.log('\n🤖 TEST 1: AURORA - Reserva Hot Desk');
  console.log('──────────────────────────────────────────────────');
  
  try {
    const reservationData = {
      userName: 'Cliente Demo',
      userEmail: DESTINATION_EMAIL,
      userPhone: '+593999000001',
      resourceType: 'Hot Desk',
      date: new Date(Date.now() + 86400000).toLocaleDateString('es-EC', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      startTime: '09:00',
      endTime: '18:00',
      duration: '9 horas',
      cost: 15.00,
      location: 'Coworkia Business Center - Edificio Coruña, Quito'
    };

    const subject = `✅ Reserva Confirmada - ${reservationData.resourceType} | ${reservationData.date.split(',')[0]}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">✅ Reserva Confirmada</h1>
      <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Coworkia Business Center</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hola <strong>${reservationData.userName}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Tu reserva ha sido <strong>confirmada exitosamente</strong>. Aquí están los detalles:
      </p>

      <!-- Detalles -->
      <div style="background-color: #F9FAFB; border-left: 4px solid #3B82F6; padding: 20px; margin: 0 0 30px 0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 40%;">📅 Fecha:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; font-weight: bold;">${reservationData.date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">⏰ Horario:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; font-weight: bold;">${reservationData.startTime} - ${reservationData.endTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">🪑 Recurso:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; font-weight: bold;">${reservationData.resourceType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">📍 Ubicación:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; font-weight: bold;">${reservationData.location}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">💰 Costo:</td>
            <td style="padding: 8px 0; color: #10B981; font-size: 16px; font-weight: bold;">$${reservationData.cost.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0;">
        Nos vemos pronto en Coworkia 🚀
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
        Coworkia Business Center | Quito, Ecuador<br>
        📱 WhatsApp: +593 99 232 0262
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to: DESTINATION_EMAIL,
      subject,
      html
    });

    if (result.success) {
      console.log('✅ Email Aurora enviado exitosamente');
      successCount++;
    } else {
      console.log('❌ Error:', result.error);
      failCount++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failCount++;
  }
}

// ═══════════════════════════════════════════════════════════════
// 2️⃣ ENZO - Cotización Proyecto IA
// ═══════════════════════════════════════════════════════════════
async function testEnzoEmail() {
  console.log('\n🎯 TEST 2: ENZO - Cotización Proyecto IA');
  console.log('──────────────────────────────────────────────────');
  
  try {
    const projectData = {
      projectId: 'ML-2026-DEMO-001',
      projectType: 'Agente Virtual con IA',
      fullName: 'Cliente Demo',
      email: DESTINATION_EMAIL,
      phone: '+593999000001',
      company: 'Empresa Demo S.A.',
      industry: 'Retail/Comercio',
      projectDescription: 'Sistema de atención al cliente 24/7 con IA para WhatsApp Business',
      estimatedBudget: '$2,500 - $5,000',
      timeline: '4-6 semanas',
      features: [
        'Agente virtual con respuestas naturales',
        'Integración WhatsApp Business API',
        'Sistema de reservas automatizado',
        'Dashboard de analytics en tiempo real',
        'Multi-idioma (ES/EN/QU)'
      ]
    };

    const subject = `🎯 Propuesta Comercial - MarketingLab | ${projectData.projectType}`;
    
    const html = generateEmailForAgent('ENZO', projectData);

    const result = await sendEmail({
      to: DESTINATION_EMAIL,
      subject,
      html
    });

    if (result.success) {
      console.log('✅ Email Enzo enviado exitosamente');
      successCount++;
    } else {
      console.log('❌ Error:', result.error);
      failCount++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failCount++;
  }
}

// ═══════════════════════════════════════════════════════════════
// 3️⃣ AXEL - Cotización Reparación Vehicular
// ═══════════════════════════════════════════════════════════════
async function testAxelEmail() {
  console.log('\n🔨 TEST 3: AXEL - Cotización Reparación');
  console.log('──────────────────────────────────────────────────');
  
  try {
    const quoteData = {
      customerName: 'Cliente Demo',
      customerEmail: DESTINATION_EMAIL,
      customerPhone: '+593999000001',
      vehicleData: {
        brand: 'Toyota',
        model: 'Corolla',
        year: '2020',
        plate: 'ABC-1234'
      },
      damageAnalysis: {
        severity: 'MODERADO',
        affectedAreas: ['Puerta lateral derecha', 'Guardafango posterior'],
        estimatedRepairTime: '3-4 días hábiles',
        requiresPainting: true,
        details: 'Rayón profundo en puerta lateral derecha con daño en pintura hasta la lámina. Guardafango posterior con abolladura menor.'
      },
      quote: 'Reparación incluye: desabolladura, preparación de superficie, pintura completa de puerta y guardafango con equiparación de tono, pulido final.',
      priceRange: {
        min: 450,
        max: 650
      },
      quoteCode: 'PB-2026-DEMO-001',
      photoUrls: [] // No photos for demo
    };

    const result = await sendQuoteEmail(quoteData);

    if (result.success) {
      console.log('✅ Email Axel enviado exitosamente');
      successCount++;
    } else {
      console.log('❌ Error:', result.error);
      failCount++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failCount++;
  }
}

// ═══════════════════════════════════════════════════════════════
// 4️⃣ PAULA - Tour Propiedad Agendado
// ═══════════════════════════════════════════════════════════════
async function testPaulaEmail() {
  console.log('\n🏡 TEST 4: PAULA - Tour Propiedad');
  console.log('──────────────────────────────────────────────────');
  
  try {
    const visitData = {
      propertyCode: 'EC-QTO-DEMO-001',
      propertyName: 'Casa Premium Cumbayá',
      propertyAddress: 'Urbanización La Primavera, Cumbayá, Quito',
      propertyType: 'Casa de lujo',
      bedrooms: 4,
      bathrooms: 3.5,
      area: 280,
      price: 385000,
      clientName: 'Cliente Demo',
      clientEmail: DESTINATION_EMAIL,
      clientPhone: '+593999000001',
      visitDate: new Date(Date.now() + 172800000).toLocaleDateString('es-EC', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      visitTime: '10:00',
      agentName: 'Paula Mendoza',
      agentPhone: '+593 99 876 5432'
    };

    const subject = `🏡 Tour Agendado - PropElite | ${visitData.propertyName}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white;">
    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🏡 Tour Agendado</h1>
      <p style="color: #D1FAE5; margin: 10px 0 0 0;">PropElite Bienes Raíces</p>
    </div>

    <div style="padding: 40px 30px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
        Hola <strong>${visitData.clientName}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; margin: 0 0 30px 0;">
        Tu tour ha sido agendado exitosamente para:
      </p>

      <div style="background-color: #F0FDF4; border-left: 4px solid #10B981; padding: 20px; margin: 0 0 30px 0;">
        <h3 style="color: #059669; margin: 0 0 15px 0;">${visitData.propertyName}</h3>
        <p style="color: #374151; margin: 0; font-size: 14px;">📍 ${visitData.propertyAddress}</p>
        <p style="color: #374151; margin: 10px 0 0 0; font-size: 14px;">
          🏠 ${visitData.bedrooms} habitaciones | 🚿 ${visitData.bathrooms} baños | 📐 ${visitData.area}m²
        </p>
        <p style="color: #059669; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">
          💰 $${visitData.price.toLocaleString('en-US')}
        </p>
      </div>

      <div style="background-color: #FFFBEB; padding: 20px; margin: 0 0 30px 0; border-radius: 8px;">
        <p style="color: #92400E; margin: 0; font-size: 14px;">
          <strong>📅 Fecha:</strong> ${visitData.visitDate}<br>
          <strong>⏰ Hora:</strong> ${visitData.visitTime}<br>
          <strong>👤 Agente:</strong> ${visitData.agentName}<br>
          <strong>📱 Contacto:</strong> ${visitData.agentPhone}
        </p>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin: 0;">
        Nos vemos pronto 🏡
      </p>
    </div>

    <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
        PropElite Bienes Raíces | Ecuador 🇪🇨 y República Dominicana 🇩🇴
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to: DESTINATION_EMAIL,
      subject,
      html
    });

    if (result.success) {
      console.log('✅ Email Paula enviado exitosamente');
      successCount++;
    } else {
      console.log('❌ Error:', result.error);
      failCount++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failCount++;
  }
}

// ═══════════════════════════════════════════════════════════════
// 5️⃣ GABI - Pago Membresía Procesado
// ═══════════════════════════════════════════════════════════════
async function testGabiEmail() {
  console.log('\n💳 TEST 5: GABI - Pago Membresía');
  console.log('──────────────────────────────────────────────────');
  
  try {
    const paymentData = {
      clientName: 'Cliente Demo',
      clientEmail: DESTINATION_EMAIL,
      clientPhone: '+593999000001',
      membershipType: 'Plan 10 Horas',
      monthlyFee: 140.00,
      paymentDate: new Date().toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      paymentMethod: 'Transferencia bancaria',
      receiptNumber: 'MP-2026-DEMO-001',
      validFrom: new Date().toLocaleDateString('es-EC'),
      validUntil: new Date(Date.now() + 30 * 86400000).toLocaleDateString('es-EC')
    };

    const subject = `💳 Pago Confirmado - Membresía ${paymentData.membershipType}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white;">
    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">💳 Pago Confirmado</h1>
      <p style="color: #E9D5FF; margin: 10px 0 0 0;">Coworkia Business Center</p>
    </div>

    <div style="padding: 40px 30px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
        Hola <strong>${paymentData.clientName}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; margin: 0 0 30px 0;">
        Tu pago ha sido <strong>procesado exitosamente</strong>. Tu membresía está activa.
      </p>

      <div style="background-color: #FAF5FF; border-left: 4px solid #8B5CF6; padding: 20px; margin: 0 0 30px 0;">
        <h3 style="color: #7C3AED; margin: 0 0 15px 0;">${paymentData.membershipType}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">💰 Monto:</td>
            <td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: bold; text-align: right;">$${paymentData.monthlyFee.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">📅 Fecha pago:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; text-align: right;">${paymentData.paymentDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">💳 Método:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; text-align: right;">${paymentData.paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">🧾 Recibo:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; text-align: right;">${paymentData.receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">✅ Válido:</td>
            <td style="padding: 8px 0; color: #1F2937; font-size: 14px; text-align: right;">${paymentData.validFrom} - ${paymentData.validUntil}</td>
          </tr>
        </table>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin: 0;">
        ¡Bienvenido a Coworkia! 🚀
      </p>
    </div>

    <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
        Coworkia Business Center | Quito, Ecuador
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to: DESTINATION_EMAIL,
      subject,
      html
    });

    if (result.success) {
      console.log('✅ Email Gabi enviado exitosamente');
      successCount++;
    } else {
      console.log('❌ Error:', result.error);
      failCount++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failCount++;
  }
}

// ═══════════════════════════════════════════════════════════════
// 6️⃣ ADRIANA - Cotización Seguro
// ═══════════════════════════════════════════════════════════════
async function testAdrianaEmail() {
  console.log('\n🛡️ TEST 6: ADRIANA - Cotización Seguro');
  console.log('──────────────────────────────────────────────────');
  
  try {
    const insuranceData = {
      leadId: 'SP-2026-DEMO-001',
      insuranceType: 'Seguro para Vehículos livianos',
      fullName: 'Cliente Demo',
      cedula: '1234567890',
      email: DESTINATION_EMAIL,
      phone: '+593999000001',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleYear: '2020',
      plate: 'ABC-1234',
      city: 'Quito',
      quotedPremium: 546.00,
      basePremium: 487.50,
      iva: 58.50,
      coverages: [
        'Daño propio',
        'Robo total',
        'Responsabilidad civil',
        'Muerte accidental',
        'Asistencia en carretera 24/7'
      ]
    };

    const subject = `🛡️ Cotización de Seguro - SegPopular | ${insuranceData.vehicleBrand} ${insuranceData.vehicleModel}`;
    
    const html = generateEmailForAgent('ADRIANA', insuranceData);

    const result = await sendEmail({
      to: DESTINATION_EMAIL,
      subject,
      html
    });

    if (result.success) {
      console.log('✅ Email Adriana enviado exitosamente');
      successCount++;
    } else {
      console.log('❌ Error:', result.error);
      failCount++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failCount++;
  }
}

// ═══════════════════════════════════════════════════════════════
// EJECUTAR TODOS LOS TESTS
// ═══════════════════════════════════════════════════════════════
async function runAllTests() {
  const startTime = Date.now();
  
  await testAuroraEmail();
  await new Promise(r => setTimeout(r, 2000)); // Delay entre emails
  
  await testEnzoEmail();
  await new Promise(r => setTimeout(r, 2000));
  
  await testAxelEmail();
  await new Promise(r => setTimeout(r, 2000));
  
  await testPaulaEmail();
  await new Promise(r => setTimeout(r, 2000));
  
  await testGabiEmail();
  await new Promise(r => setTimeout(r, 2000));
  
  await testAdrianaEmail();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Emails enviados exitosamente: ${successCount}/6`);
  console.log(`❌ Emails fallidos: ${failCount}/6`);
  console.log(`⏱️ Tiempo total: ${duration}s`);
  console.log(`📬 Destinatario: ${DESTINATION_EMAIL}`);
  console.log('\n💡 Revisa tu bandeja de entrada (y spam)\n');
}

// Ejecutar
runAllTests().catch(console.error);
