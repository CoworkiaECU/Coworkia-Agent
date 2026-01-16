/**
 * Test solo del email de Axel (PaintBull) con nuevo diseño
 */

import { generateEmailForAgent } from '../../src/servicios/generic-email-templates.js';
import { sendEmail } from '../../src/servicios/email.js';

const TEST_EMAIL = 'mktlab.ec@gmail.com';

async function testAxelEmail() {
  console.log('🟠 === TEST: AXEL (PaintBull) - Nuevo Diseño ===\n');
  
  const leadData = {
    quoteCode: 'AXEL-2026-0001',
    fullName: 'Diego Villota',
    email: TEST_EMAIL,
    phone: '+593999999999',
    vehicleBrand: 'Kia',
    vehicleModel: 'Seltos',
    vehicleYear: '2020',
    damageType: 'Colisión lateral',
    damageAnalysis: {
      severity: 'LEVE',
      details: 'Enderezado de abolladura en puerta lateral, reparación de rayones en guardabarro, retoque de pintura en parachoques delantero, pulido y acabado profesional',
      parts: 'Puerta lateral, Guardabarro, Parachoques delantero',
      risk: 'Bajo riesgo de daños estructurales',
      estimatedDays: '3-4 días hábiles (incluye tiempo de secado de pintura)'
    },
    quoteDetails: 'Trabajos requeridos: Enderezado de abolladura en puerta lateral, Reparación de rayones en guardabarro, Retoque de pintura en parachoques delantero, Pulido y acabado profesional',
    priceMin: 720,
    priceMax: 960,
    photoCount: 4
  };

  const emailHTML = generateEmailForAgent('AXEL', leadData);
  const subject = `🔨 Cotización de Reparación - PaintBull | ${leadData.vehicleBrand} ${leadData.vehicleModel}`;
  
  console.log('📧 Subject:', subject);
  console.log('📄 HTML generado:', emailHTML ? '✅' : '❌');
  console.log('📏 Tamaño HTML:', emailHTML.length, 'caracteres\n');
  
  const result = await sendEmail({
    to: TEST_EMAIL,
    subject: subject,
    html: emailHTML
  });
  
  if (result.success) {
    console.log('✅ Email enviado exitosamente a', TEST_EMAIL);
    console.log('💡 Revisa tu bandeja de entrada o SPAM');
  } else {
    console.log('❌ Error:', result.error);
  }
}

testAxelEmail();
