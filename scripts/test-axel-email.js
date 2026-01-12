#!/usr/bin/env node
/**
 * 🧪 TEST: Email de cotización de Axel
 * Envía un email de prueba a yo@diegovillota.com
 */

import { sendQuoteEmail } from '../src/servicios/axel-quote-email.js';

async function testAxelEmail() {
  console.log('🧪 ════════════════════════════════════════════════');
  console.log('   TEST EMAIL COTIZACIÓN AXEL - THE PAINTBULL');
  console.log('════════════════════════════════════════════════\n');

  // Datos simulados basados en la conversación real con Axel
  const testData = {
    customerEmail: 'yo@diegovillota.com',
    customerName: 'Diego Villota',
    
    vehicleData: {
      marca: 'Kia',
      modelo: 'Seltos',
      año: '2020'
    },
    
    damageAnalysis: {
      severity: 'LEVE',
      damageAreas: ['parachoques', 'puerta', 'guardabarro'],
      description: 'El daño es leve, se puede solucionar sin problema. Se observan rayones y pequeñas abolladuras en la zona lateral del vehículo.'
    },
    
    quote: `Basado en las fotos analizadas, el trabajo incluiría:

🔧 TRABAJOS REQUERIDOS:
• Enderezado de abolladura en puerta lateral
• Reparación de rayones en guardabarro
• Retoque de pintura en parachoques delantero
• Pulido y acabado profesional

⏱️ TIEMPO ESTIMADO:
3-4 días hábiles (incluye tiempo de secado de pintura)

📋 PROCESO:
1. Desmontaje de piezas afectadas
2. Enderezado y preparación de superficie
3. Masillado y lijado
4. Aplicación de pintura (color original)
5. Barniz y pulido final

✨ GARANTÍA:
• 6 meses en trabajos de enderezada
• 1 año en pintura aplicada`,
    
    priceRange: {
      min: 720,
      max: 960,
      currency: 'USD'
    },
    
    // URLs de las fotos (estas son las del chat - si están disponibles en producción)
    photoUrls: [
      'https://example.com/photo1.jpg', // Nota: Reemplazar con URLs reales si están disponibles
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
      'https://example.com/photo4.jpg'
    ]
  };

  console.log('📋 DATOS DE LA COTIZACIÓN:');
  console.log(`   Cliente: ${testData.customerName}`);
  console.log(`   Email: ${testData.customerEmail}`);
  console.log(`   Vehículo: ${testData.vehicleData.marca} ${testData.vehicleData.modelo} ${testData.vehicleData.año}`);
  console.log(`   Severidad: ${testData.damageAnalysis.severity}`);
  console.log(`   Áreas dañadas: ${testData.damageAnalysis.damageAreas.join(', ')}`);
  console.log(`   Precio: $${testData.priceRange.min} - $${testData.priceRange.max}\n`);

  console.log('📧 Enviando email...\n');

  const result = await sendQuoteEmail(testData);

  if (result.success) {
    console.log('✅ ════════════════════════════════════════════════');
    console.log('   EMAIL ENVIADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════');
    console.log(`\n📬 Revisa tu bandeja: ${testData.customerEmail}`);
    console.log('📁 Carpeta: Inbox o Spam');
    console.log('📧 Asunto: 🚗 Cotización PaintBull - Kia Seltos 2020\n');
    
    if (result.messageId) {
      console.log(`🆔 Message ID: ${result.messageId}`);
    }
  } else {
    console.log('❌ ════════════════════════════════════════════════');
    console.log('   ERROR ENVIANDO EMAIL');
    console.log('════════════════════════════════════════════════');
    console.error(`\n🚨 Error: ${result.error}\n`);
    
    if (result.error.includes('credentials') || result.error.includes('authentication')) {
      console.log('💡 POSIBLE CAUSA: Credenciales de Gmail no configuradas');
      console.log('   Verifica las variables de entorno:');
      console.log('   - GMAIL_USER');
      console.log('   - GMAIL_APP_PASSWORD\n');
    }
  }

  console.log('════════════════════════════════════════════════\n');
  process.exit(result.success ? 0 : 1);
}

testAxelEmail().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
