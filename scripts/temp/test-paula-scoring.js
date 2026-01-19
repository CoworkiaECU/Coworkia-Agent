import { sendEmail } from '../../src/servicios/email.js';
import { generatePaulaEmailHTML } from '../../src/servicios/generic-email-templates.js';

const DESTINATARIO = 'yo@diegovillota.com';
const COPIA = 'izurietarquitectos@gmail.com';

async function testPaulaScoring() {
  console.log('🧪 TEST: Paula Email con Lead Scoring');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Datos básicos del lead
  const leadData = {
    userName: 'Juan Pérez',
    operationType: 'Compra',
    propertyType: 'Casa 7 - Casas Jardín',
    zone: 'El Morenal',
    budgetRange: '$340,000 - $360,000',
    email: 'juan.perez@example.com',
    phone: '+593 99 123 4567',
    leadId: 'CJ-LEAD-001'
  };

  // Datos para lead scoring (Cliente ALTO - bien calificado)
  const leadScoreData = {
    // Capacidad de Pago
    mencionaAnticipoDisponible: true,
    tipoPago: 'efectivo',
    timeline: '1-3meses',
    tienePropiedades: 'si_una',
    
    // Origen de Fondos (UAFE compliant)
    actividadEconomica: 'ingeniero civil',
    tipoIngreso: 'independiente_registrado',
    coherenciaRecursos: 'alta',
    
    // Interés Genuino
    preguntasRealizadas: 7,
    solicitoFichas: true,
    solicitoRenders: true,
    solicitoPlanos: true,
    agendoVisita: true,
    
    // Perfil Familiar
    numeroPersonas: 3,
    edadHijos: [14],
    casaInteres: 7,
    
    // Red Flags (ninguno - cliente limpio)
    evasivoActividad: false,
    inconsistenciaPago: false,
    urgenciaExtrema: false,
    efectivoGrande: false,
    cambiosHistoria: 0,
    nombre: 'Juan Pérez',
    telefono: '+593 99 123 4567',
    email: 'juan.perez@example.com'
  };

  try {
    console.log('\n📧 Generando email con lead scoring...');
    const htmlContent = generatePaulaEmailHTML(leadData, leadScoreData);

    console.log('\n📤 Enviando a:');
    console.log(`   → ${DESTINATARIO}`);
    console.log(`   → ${COPIA} (copia)`);

    const resultado = await sendEmail({
      to: `${DESTINATARIO}, ${COPIA}`,
      subject: '🏡 PropElite: Búsqueda Iniciada - Casa 7 Casas Jardín',
      html: htmlContent
    });

    if (resultado.success) {
      console.log('\n✅ EMAIL ENVIADO EXITOSAMENTE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📊 Lead Score Incluido:');
      console.log('   • Capacidad de Pago');
      console.log('   • Origen de Fondos (UAFE)');
      console.log('   • Interés Genuino');
      console.log('   • Perfil Familiar');
      console.log('   • Red Flags Detection');
      console.log('\n💌 Revisa tu inbox:');
      console.log(`   → ${DESTINATARIO}`);
      console.log(`   → ${COPIA}`);
      console.log('\n🎨 Diseño: Verde Oliva + Dorado Champagne');
      console.log('🏷️  Marca: Prop Elite - PRIME LIVING');
    } else {
      console.error('\n❌ ERROR al enviar email:', resultado.error);
    }

  } catch (error) {
    console.error('\n❌ ERROR en test:', error.message);
    console.error(error);
  }
}

// Ejecutar test
testPaulaScoring();
