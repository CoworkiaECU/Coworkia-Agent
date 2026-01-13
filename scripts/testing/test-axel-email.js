#!/usr/bin/env node
/**
 * 🧪 TEST: Email de cotización de Axel
 * Envía emails de prueba a yo@diegovillota.com y villotaj71@gmail.com
 */

import { sendQuoteEmail } from '../../src/servicios/axel-quote-email.js';

async function testAxelEmail() {
  console.log('🧪 ════════════════════════════════════════════════');
  console.log('   TEST EMAIL COTIZACIÓN AXEL - THE PAINTBULL');
  console.log('════════════════════════════════════════════════\n');

  // Lista de destinatarios
  const recipients = [
    { email: 'yo@diegovillota.com', name: 'Diego Villota', role: 'Cliente' },
    { email: 'villotaj71@gmail.com', name: 'Jefe de Taller', role: 'Taller PaintBull' }
  ];

  // Datos simulados basados en la conversación real con Axel
  const baseTestData = {
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
    
    // Código de cotización simulado
    quoteCode: 'AXEL-2026-0001',
    
    // URLs de las fotos (nota: las URLs de WhatsApp son temporales)
    photoUrls: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
      'https://example.com/photo4.jpg'
    ]
  };

  console.log('📋 DATOS DE LA COTIZACIÓN:');
  console.log(`   Vehículo: ${baseTestData.vehicleData.marca} ${baseTestData.vehicleData.modelo} ${baseTestData.vehicleData.año}`);
  console.log(`   Código: ${baseTestData.quoteCode}`);
  console.log(`   Severidad: ${baseTestData.damageAnalysis.severity}`);
  console.log(`   Áreas dañadas: ${baseTestData.damageAnalysis.damageAreas.join(', ')}`);
  console.log(`   Precio: $${baseTestData.priceRange.min} - $${baseTestData.priceRange.max}`);
  console.log(`   Destinatarios: ${recipients.length}\n`);

  // Enviar a cada destinatario
  const results = [];
  
  for (const recipient of recipients) {
    console.log(`📧 Enviando a ${recipient.role}: ${recipient.email}...`);
    
    const testData = {
      ...baseTestData,
      customerEmail: recipient.email,
      customerName: recipient.name
    };
    
    const result = await sendQuoteEmail(testData);
    results.push({ recipient, result });
    
    if (result.success) {
      console.log(`   ✅ Enviado exitosamente (ID: ${result.messageId?.substring(0, 12)}...)\n`);
    } else {
      console.log(`   ❌ Error: ${result.error}\n`);
    }
  }

  // Resumen final
  console.log('════════════════════════════════════════════════');
  console.log('   RESUMEN DE ENVÍOS');
  console.log('════════════════════════════════════════════════\n');
  
  const successful = results.filter(r => r.result.success).length;
  const failed = results.filter(r => !r.result.success).length;
  
  results.forEach(({ recipient, result }) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${recipient.role}: ${recipient.email}`);
    if (result.messageId) {
      console.log(`   🆔 ${result.messageId}`);
    }
  });
  
  console.log(`\n📊 Total: ${successful} exitosos | ${failed} fallidos`);
  console.log(`📧 Asunto: 🚗 Cotización ${baseTestData.quoteCode} - Kia Seltos 2020`);
  console.log(`🔢 Código: ${baseTestData.quoteCode}`);
  console.log('\n📬 Revisa las bandejas (Inbox o Spam)');
  console.log('════════════════════════════════════════════════\n');
  
  process.exit(failed === 0 ? 0 : 1);
}

testAxelEmail().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
