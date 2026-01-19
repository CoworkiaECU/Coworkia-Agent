/**
 * 🚨 TEST URGENTE - Templates Adriana y Enzo
 * Envía emails de prueba a yo@diegovillota.com
 */

import { sendEmail } from '../../src/servicios/email.js';
import { 
  generateAdrianaEmailHTML, 
  generateEnzoEmailHTML 
} from '../../src/servicios/generic-email-templates.js';

async function testAdrianaEmail() {
  console.log('\n🛡️ TEST ADRIANA (SegPopular) - Seguro Vehicular\n');
  
  const leadData = {
    userName: 'Diego Villota',
    insuranceType: 'Vehículo',
    cedula: '1702683499',
    email: 'yo@diegovillota.com',
    phone: '0994837117',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla 2020',
    leadId: 'TEST-ADR-' + Date.now()
  };

  const html = generateAdrianaEmailHTML(leadData);
  
  const result = await sendEmail({
    to: 'yo@diegovillota.com',
    subject: '🛡️ TEST - Solicitud de Seguro Vehicular - SegPopular',
    html: html,
    from: '"Adriana - SegPopular" <coworkia.ec@gmail.com>'
  });

  if (result.success) {
    console.log('✅ Email de Adriana enviado exitosamente');
    console.log('📧 Revisa yo@diegovillota.com');
  } else {
    console.error('❌ Error:', result.error);
  }

  return result;
}

async function testEnzoEmail() {
  console.log('\n🎯 TEST ENZO (MarketingLab) - Proyecto Marketing\n');
  
  const leadData = {
    userName: 'Diego Villota',
    projectType: 'Campaña en Redes Sociales',
    companyName: 'Coworkia Ecuador',
    email: 'yo@diegovillota.com',
    phone: '0994837117',
    budget: '$2,000 - $5,000',
    urgency: 'Media (2-4 semanas)',
    description: 'Necesito aumentar visibilidad en Instagram y Facebook para atraer clientes al coworking',
    leadId: 'TEST-ENZ-' + Date.now()
  };

  const html = generateEnzoEmailHTML(leadData);
  
  const result = await sendEmail({
    to: 'yo@diegovillota.com',
    subject: '🎯 TEST - Proyecto de Marketing Digital - MarketingLab',
    html: html,
    from: '"Enzo - MarketingLab" <coworkia.ec@gmail.com>'
  });

  if (result.success) {
    console.log('✅ Email de Enzo enviado exitosamente');
    console.log('📧 Revisa yo@diegovillota.com');
  } else {
    console.error('❌ Error:', result.error);
  }

  return result;
}

// Ejecutar tests
console.log('🚀 INICIANDO TESTS URGENTES DE EMAILS\n');
console.log('📧 Destinatario: yo@diegovillota.com\n');
console.log('⏱️ Timestamp:', new Date().toLocaleString('es-EC'));
console.log('─'.repeat(60));

try {
  const adrianaResult = await testAdrianaEmail();
  console.log('─'.repeat(60));
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s
  
  const enzoResult = await testEnzoEmail();
  console.log('─'.repeat(60));
  
  console.log('\n✅ TESTS COMPLETADOS\n');
  console.log('📊 Resultados:');
  console.log(`   Adriana: ${adrianaResult.success ? '✅ ENVIADO' : '❌ FALLO'}`);
  console.log(`   Enzo:    ${enzoResult.success ? '✅ ENVIADO' : '❌ FALLO'}`);
  console.log('\n📧 Revisa tu inbox: yo@diegovillota.com');
  console.log('💡 Si no ves los emails, revisa spam/promociones\n');
  
} catch (error) {
  console.error('\n❌ ERROR FATAL:', error.message);
  console.error(error);
  process.exit(1);
}
