/**
 * 📧 Script de Prueba LOCAL - Email de Cotización Adriana
 * 
 * OBJETIVO:
 * Simular SOLO el envío de email con datos ficticios (sin AI Vision, sin DB)
 * 
 * DATOS SIMULADOS:
 * - Matrícula y licencia (como si AI Vision los hubiera extraído)
 * - Cotización calculada
 * - Lead completo
 * 
 * REQUISITO:
 * Agregar credenciales a .env:
 * EMAIL_USER=tu-email@gmail.com
 * EMAIL_PASS=tu-app-password-gmail
 */

import dotenv from 'dotenv';
dotenv.config();

import { sendEmail } from '../../src/servicios/email.js';
import { generateEmailForAgent } from '../../src/servicios/generic-email-templates.js';

// ==========================================
// 📊 DATOS SIMULADOS (como si vinieron de AI Vision)
// ==========================================

const SIMULATED_LEAD_DATA = {
  leadId: 'insurance_test_local_001',
  
  // Datos del vehículo (simulados de matrícula)
  insuranceType: 'Seguro para Vehículos livianos',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Corolla',
  vehicleYear: 2020,
  plate: 'ABC-1234',
  motor: '2ZR-FE-12345678',
  chasis: '9BR-ABC123XYZ456',
  originCountry: 'Japón',
  city: 'Quito',
  commercialValue: 42000,
  
  // Datos del cliente (simulados de licencia)
  fullName: 'Diego Villota',
  cedula: '1234567890',
  email: 'yo@diegovillota.com', // TU EMAIL AQUÍ
  phone: '+593 99 999 9999',
  licenseType: 'C',
  licenseExpiry: '2026-09-15',
  
  // Cotización calculada
  quotedPremium: 1619.41,
  basePremium: 1373.40,
  iva: 206.01,
  emissionCost: 25.00,
  otherCosts: 15.00
};

// ==========================================
// 🧮 FUNCIÓN DE COTIZACIÓN (igual que insurance-form.js)
// ==========================================

function calculatePremium(commercialValue) {
  const RATE = 0.0327; // 3.27%
  const IVA_RATE = 0.15; // 15%
  const EMISSION_COST = 25;
  const OTHER_COSTS = 15;
  
  const basePremium = commercialValue * RATE;
  const iva = basePremium * IVA_RATE;
  const totalPremium = basePremium + iva + EMISSION_COST + OTHER_COSTS;
  
  return {
    basePremium: Math.round(basePremium * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    emissionCost: EMISSION_COST,
    otherCosts: OTHER_COSTS,
    totalPremium: Math.round(totalPremium * 100) / 100
  };
}

// ==========================================
// 📧 ENVIAR EMAIL DE PRUEBA
// ==========================================

async function testAdrianaQuoteEmail() {
  console.log('📧 Iniciando prueba de email de cotización Adriana...\n');
  
  // Verificar credenciales
  const EMAIL_USER = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
  
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('❌ ERROR: No hay credenciales de email en .env');
    console.error('\nAgrega estas líneas a tu .env:');
    console.error('EMAIL_USER=tu-email@gmail.com');
    console.error('EMAIL_PASS=tu-app-password-de-16-caracteres\n');
    console.error('Para obtener App Password: https://myaccount.google.com/apppasswords');
    process.exit(1);
  }
  
  console.log(`✅ Credenciales encontradas: ${EMAIL_USER}\n`);
  
  // Recalcular cotización para estar seguros
  const recalculated = calculatePremium(SIMULATED_LEAD_DATA.commercialValue);
  console.log('🧮 COTIZACIÓN RECALCULADA:');
  console.log(`   Valor comercial: $${SIMULATED_LEAD_DATA.commercialValue.toLocaleString('en-US')}`);
  console.log(`   Prima base: $${recalculated.basePremium.toFixed(2)}`);
  console.log(`   IVA (15%): $${recalculated.iva.toFixed(2)}`);
  console.log(`   Emisión: $${recalculated.emissionCost.toFixed(2)}`);
  console.log(`   Otros: $${recalculated.otherCosts.toFixed(2)}`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   TOTAL: $${recalculated.totalPremium.toFixed(2)}\n`);
  
  // Generar HTML del email
  console.log('📝 Generando HTML del email con template SegPopular...');
  const emailHTML = generateEmailForAgent('ADRIANA', SIMULATED_LEAD_DATA);
  
  // Enviar email
  console.log(`📤 Enviando email a: ${SIMULATED_LEAD_DATA.email}...\n`);
  
  try {
    const result = await sendEmail({
      to: SIMULATED_LEAD_DATA.email,
      subject: `🛡️ [PRUEBA LOCAL] Cotización de Seguro - SegPopular | ${SIMULATED_LEAD_DATA.vehicleBrand} ${SIMULATED_LEAD_DATA.vehicleModel}`,
      html: emailHTML
    });
    
    console.log('✅ EMAIL ENVIADO EXITOSAMENTE!\n');
    console.log('📊 RESULTADO:', result);
    console.log('\n🎉 PRUEBA COMPLETADA');
    console.log(`📬 Revisa tu bandeja: ${SIMULATED_LEAD_DATA.email}`);
    console.log('📤 El email también quedó en: Enviados de Gmail\n');
    
    console.log('💡 PRÓXIMOS PASOS:');
    console.log('   1. Verificar que el email llegó correctamente');
    console.log('   2. Revisar diseño SegPopular (amarillo/azul)');
    console.log('   3. Confirmar que todos los datos se muestran');
    console.log('   4. Si todo OK → hacer deploy para pruebas en producción con WhatsApp\n');
    
  } catch (error) {
    console.error('❌ ERROR ENVIANDO EMAIL:', error.message);
    console.error('\nPosibles causas:');
    console.error('1. App Password incorrecto');
    console.error('2. Gmail bloqueando el acceso');
    console.error('3. Credenciales incorrectas\n');
    throw error;
  }
}

// Ejecutar
testAdrianaQuoteEmail().catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});
