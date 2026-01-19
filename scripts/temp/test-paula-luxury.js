/**
 * 🧪 TEST PAULA (PropElite) - Diseño Luxury
 * Test urgente del nuevo diseño elite: negro, dorado champagne, minimalista
 */

import { generatePaulaEmailHTML } from '../../src/servicios/generic-email-templates.js';
import { sendEmail } from '../../src/servicios/email.js';

const DESTINATARIO = 'yo@diegovillota.com';
const COPIA = 'izurietarquitectos@gmail.com';

async function testPaulaLuxury() {
  console.log('\n💎 TEST PAULA (PropElite) - Diseño Luxury Elite\n');

  const leadData = {
    userName: 'Alejandra Martínez',
    operationType: 'Compra',
    propertyType: 'Penthouse',
    zone: 'La Carolina - Quito',
    budgetRange: '$450,000 - $650,000',
    email: 'alejandra.martinez@example.com',
    phone: '+593 99 888 7777',
    leadId: 'PROP-ELITE-2026-001'
  };

  try {
    // Generar HTML con nuevo diseño luxury
    const htmlContent = generatePaulaEmailHTML(leadData);
    
    // Enviar email a ambos destinatarios
    const result = await sendEmail({
      to: `${DESTINATARIO}, ${COPIA}`,
      subject: 'Búsqueda de Propiedad Exclusiva - PropElite',
      html: htmlContent
    });

    if (result.success) {
      console.log('✅ Email de Paula (Luxury) enviado exitosamente');
      console.log(`📧 Destinatarios: ${DESTINATARIO}, ${COPIA}`);
      console.log(`📝 Lead: Penthouse en La Carolina`);
      console.log(`💰 Presupuesto: $450K - $650K`);
      console.log(`🎨 Diseño: Verde oliva + Dorado champagne (Elite/Luxury)`);
    } else {
      console.error('❌ Error al enviar email:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error en test:', error.message);
    process.exit(1);
  }
}

// Ejecutar test
testPaulaLuxury()
  .then(() => {
    console.log('\n✅ TEST COMPLETADO');
    console.log('📧 Revisa tu inbox:', DESTINATARIO);
    console.log('📧 Copia enviada a:', COPIA);
    console.log('🎨 Verifica: Verde oliva, dorado champagne, minimalista, elegante\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ TEST FALLÓ:', error.message);
    process.exit(1);
  });
