/**
 * Test de Emails para los 3 Agentes Especializados
 * - Adriana (SegPopular): Cotización de seguro
 * - Axel (PaintBull): Cotización de reparación
 * - Enzo (MarketingLab): Confirmación de proyecto
 */

import { generateEmailForAgent } from '../../src/servicios/generic-email-templates.js';
import { sendEmail } from '../../src/servicios/email.js';

const TEST_EMAIL = 'mktlab.ec@gmail.com'; // Reemplaza con tu email real

async function testAdrianaEmail() {
  console.log('\n🔵 === TEST 1: ADRIANA (SegPopular) - Cotización Seguro ===');
  
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
  
  const result = await sendEmail({
    to: TEST_EMAIL,
    subject: subject,
    html: emailHTML
  });
  
  if (result.success) {
    console.log('✅ Email enviado exitosamente a', TEST_EMAIL);
  } else {
    console.log('❌ Error:', result.error);
  }
}

async function testAxelEmail() {
  console.log('\n🟠 === TEST 2: AXEL (PaintBull) - Cotización Reparación ===');
  
  const leadData = {
    quoteId: 'PB-2026-TEST-001',
    quoteCode: 'PB-2026-001',
    damageType: 'Colisión frontal',
    fullName: 'Diego Villota',
    email: TEST_EMAIL,
    phone: '+593999999999',
    vehicleBrand: 'Honda',
    vehicleModel: 'Civic',
    vehicleYear: '2019',
    damageDescription: 'Colisión frontal con daños en parachoques y capó',
    damageAnalysis: {
      severity: 'MODERADO',
      details: 'Daños en estructura frontal, parachoques roto, capó abollado',
      parts: 'Parachoques delantero, Capó, Faro derecho',
      risk: 'Bajo riesgo de daños estructurales',
      estimatedDays: '3-5 días hábiles'
    },
    quoteDetails: 'Reparación completa incluye: pintura del área afectada, reemplazo de parachoques y faro derecho, ajustes de estructura si necesario.',
    priceMin: 800,
    priceMax: 1200,
    photoCount: 2
  };

  const emailHTML = generateEmailForAgent('AXEL', leadData);
  const subject = `🔨 Cotización de Reparación - PaintBull | ${leadData.vehicleBrand} ${leadData.vehicleModel}`;
  
  console.log('📧 Subject:', subject);
  console.log('📄 HTML generado:', emailHTML ? '✅' : '❌');
  
  const result = await sendEmail({
    to: TEST_EMAIL,
    subject: subject,
    html: emailHTML
  });
  
  if (result.success) {
    console.log('✅ Email enviado exitosamente a', TEST_EMAIL);
  } else {
    console.log('❌ Error:', result.error);
  }
}

async function testEnzoEmail() {
  console.log('\n🟣 === TEST 3: ENZO (MarketingLab) - Confirmación Proyecto ===');
  
  const leadData = {
    projectId: 'ML-2026-TEST-001',
    projectCode: 'ML-2026-001',
    projectType: 'Campaña Redes Sociales',
    companyName: 'Coworkia Tech',
    fullName: 'Diego Villota',
    email: TEST_EMAIL,
    phone: '+593999999999',
    budget: '500-1000 USD',
    urgency: 'Media (2-4 semanas)',
    description: 'Necesito aumentar engagement en Instagram y Facebook, crear contenido profesional y campañas pagadas para mi startup.'
  };

  const emailHTML = generateEmailForAgent('ENZO', leadData);
  const subject = `🎯 Proyecto Recibido - MarketingLab | ${leadData.projectType}`;
  
  console.log('📧 Subject:', subject);
  console.log('📄 HTML generado:', emailHTML ? '✅' : '❌');
  
  const result = await sendEmail({
    to: TEST_EMAIL,
    subject: subject,
    html: emailHTML
  });
  
  if (result.success) {
    console.log('✅ Email enviado exitosamente a', TEST_EMAIL);
  } else {
    console.log('❌ Error:', result.error);
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando pruebas de emails para 3 agentes...\n');
  console.log('📬 Todos los emails se enviarán a:', TEST_EMAIL);
  console.log('⏱️  Espera aproximadamente 15 segundos...\n');

  try {
    await testAdrianaEmail();
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
    
    await testAxelEmail();
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
    
    await testEnzoEmail();
    
    console.log('\n✅ === PRUEBAS COMPLETADAS ===');
    console.log('📧 Revisa tu bandeja de entrada:', TEST_EMAIL);
    console.log('💡 Verifica también la carpeta de SPAM si no los ves');
    
  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
  }
}

runAllTests();
