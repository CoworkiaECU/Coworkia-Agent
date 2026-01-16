/**
 * Test solo del email de Adriana (SegPopular)
 */

import { generateEmailForAgent } from '../../src/servicios/generic-email-templates.js';
import { sendEmail } from '../../src/servicios/email.js';

const TEST_EMAIL = 'mktlab.ec@gmail.com';

async function testAdrianaEmail() {
  console.log('🔵 === TEST: ADRIANA (SegPopular) - Cotización Seguro ===\n');
  
  const leadData = {
    leadId: 'SP-2026-TEST-001',
    insuranceType: 'Seguro para Vehículos livianos',
    fullName: 'Diego Villota',
    cedula: '1234567890',
    email: TEST_EMAIL,
    phone: '+593999999999',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: '2020',
    plate: 'ABC-1234',
    city: 'Quito',
    quotedPremium: 546.00,
    basePremium: 487.50,
    iva: 58.50,
    emissionCost: 0,
    otherCosts: 0
  };

  const emailHTML = generateEmailForAgent('ADRIANA', leadData);
  const subject = `🛡️ Cotización de Seguro - SegPopular | ${leadData.vehicleBrand} ${leadData.vehicleModel}`;
  
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

testAdrianaEmail();
