/**
 * 📧 Script de prueba - Email de GABI con oferta de servicios
 * 
 * Envía email de prueba a yo@diegovillota.com para revisar
 * el template y hacer ajustes necesarios
 */

import { generateGabiEmailHTML } from '../../src/servicios/generic-email-templates.js';
import { sendEmail } from '../../src/servicios/email.js';

async function sendGabiTestEmail() {
  console.log('📧 Enviando email de prueba de GABI...\n');

  // Datos de prueba - Oferta de servicios completa
  const testData = {
    // Información del lead
    userName: 'Diego Villota',
    consultationType: 'Cumplimiento Normativo UAFE',
    company: 'AutoElite Motors S.A.',
    ruc: '1791234567001',
    email: 'yo@diegovillota.com',
    phone: '+593999999999',
    description: 'Necesito implementar procesos de control requeridos por UAFE para mi patio de compra y venta de autos usados de media y alta gama. Requiero asesoría como Oficial de Cumplimiento para establecer políticas de prevención de lavado de activos, matrices de riesgo, procedimientos KYC (Know Your Customer), reportes ROS/RUI, y capacitación del personal en cumplimiento normativo AML/CFT conforme a la LOPDLAFT.',
    urgency: 'Urgente',
    
    // Información del código de consultoría
    consultationCode: 'GRC-2026-TEST',
    
    // Información de la reunión (para email cliente)
    meetingDate: 'Miércoles 4 de Febrero, 2026',
    meetingTime: '10:00 AM (Quito, Ecuador)',
    
    // Tipo de destinatario
    recipientType: 'client' // 'admin' o 'client'
  };

  try {
    // Generar HTML del email
    const emailHTML = generateGabiEmailHTML(testData);
    
    // Preparar email
    const emailOptions = {
      to: 'yo@diegovillota.com',
      from: `"Gabi · GR Consulting" <${process.env.EMAIL_USER || 'secretaria.coworkia@gmail.com'}>`,
      subject: `Cotización 💼 ${testData.consultationCode} — ${testData.consultationType} · ${testData.company} | Gabi - GR Consulting`,

      html: emailHTML
    };

    console.log('📤 Enviando a:', emailOptions.to);
    console.log('📋 Asunto:', emailOptions.subject);
    console.log('🔑 Código:', testData.consultationCode);
    console.log('');

    // Enviar email
    const result = await sendEmail(emailOptions);
    
    if (result.success) {
      console.log('✅ EMAIL ENVIADO EXITOSAMENTE\n');
      console.log('═══════════════════════════════════════');
      console.log('📧 Revisa tu bandeja: yo@diegovillota.com');
      console.log('═══════════════════════════════════════\n');
      console.log('📝 Contenido del email:');
      console.log('   • Código: GRC-2026-TEST');
      console.log('   • Cliente: Diego Villota');
      console.log('   • Empresa: AutoElite Motors S.A. (Patio de autos)');
      console.log('   • RUC: 1791234567001');
      console.log('   • Tipo: Cumplimiento Normativo UAFE');
      console.log('   • Urgencia: Urgente (24h)');
      console.log('   • Reunión: Miércoles 4 Feb, 10:00 AM');
      console.log('   • Primera consultoría: GRATUITA (30 min)');
      console.log('');
      console.log('📋 Servicios UAFE incluidos en la asesoría:');
      console.log('   • Oficial de Cumplimiento certificado');
      console.log('   • Políticas prevención lavado de activos');
      console.log('   • Matrices de riesgo por tipo de operación');
      console.log('   • Procedimientos KYC (Know Your Customer)');
      console.log('   • Reportes ROS/RUI ante UAFE');
      console.log('   • Capacitación AML/CFT para personal');
      console.log('   • Debida diligencia en transacciones');
      console.log('');
      console.log('🎨 Diseño:');
      console.log('   • Colores: Azul profesional (#1E3A8A, #3B82F6)');
      console.log('   • Logo: Balanza ⚖️');
      console.log('   • Branding: GR Consulting');
      console.log('   • Secciones: Código + Datos Cliente + Detalles + Reunión + Próximos pasos');
      console.log('');
      console.log('💡 Ahora dime qué ajustes necesitas:');
      console.log('   - ¿Cambiar colores?');
      console.log('   - ¿Modificar textos?');
      console.log('   - ¿Agregar/quitar secciones?');
      console.log('   - ¿Ajustar logo o diseño?');
      console.log('');
    } else {
      console.error('❌ Error enviando email:', result.error);
    }

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar
sendGabiTestEmail();
