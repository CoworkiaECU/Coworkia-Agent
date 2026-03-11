#!/usr/bin/env node
/**
 * 🧪 TEST EMAIL — Paula / PropElite Bienes Raíces
 *
 * USO:
 *   node scripts/test-paula-email.mjs <email-destino>
 *
 * EJEMPLO:
 *   node scripts/test-paula-email.mjs yo@diegovillota.com
 */

import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from '../src/servicios/email.js';
import { generateEmailForAgent } from '../src/servicios/generic-email-templates.js';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log(`
USO:
  node scripts/test-paula-email.mjs <email>

EJEMPLO:
  node scripts/test-paula-email.mjs yo@diegovillota.com
`);
  process.exit(0);
}

const testEmail = args[0];

if (!testEmail.includes('@')) {
  console.error('❌ Email inválido');
  process.exit(1);
}

const emailData = {
  clientName:          'Diego Villota',
  fullName:            'Diego Villota',
  leadCode:            'INM-2026-0001',
  operationType:       'compra',
  propertyType:        'Departamento',
  country:             'Ecuador',
  city:                'Quito',
  zone:                'Cumbayá / Valle de los Chillos',
  budgetRange:         '$120.000 - $180.000',
  email:               testEmail,
  phone:               '+593 99 483 7117',
  bedrooms:            '2',
  bathrooms:           '2',
  preferredZone:       'Cumbayá / Valle de los Chillos',
  financing:           'Biess - crédito hipotecario',
  urgency:             '3 a 6 meses',
  specialRequirements: 'Preferiblemente planta baja, cerca a ciclovía',
  agentName:           'Paula',
  agentCompany:        'PropElite Bienes Raíces'
};

console.log('');
console.log('┌────────────────────────────────────────────────┐');
console.log('│  🧪 INICIANDO TEST EMAIL PAULA                │');
console.log('└────────────────────────────────────────────────┘');
console.log('');
console.log(`📧 Destinatario:  ${testEmail}`);
console.log(`🏠 Operación:     ${emailData.operationType} de ${emailData.propertyType}`);
console.log(`📍 Zona:          ${emailData.preferredZone}`);
console.log(`💵 Presupuesto:   ${emailData.budgetRange}`);
console.log('');
console.log('⏳ Enviando email de prueba...');
console.log('');

try {
  const { subject, html } = generateEmailForAgent('PAULA', 'client', { clientName: emailData.fullName, ...emailData });

  await sendEmail({
    to:      testEmail,
    subject: subject,
    html,
    from:    { name: AGENT_FROM_NAMES?.paula || 'Paula - PropElite', address: DEFAULT_FROM_EMAIL },
  });

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ✅ EMAIL PAULA ENVIADO CORRECTAMENTE        ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📬 Asunto: ${subject}`);
  console.log(`📧 Enviado a: ${testEmail}`);
  console.log('');
  console.log('┌────────────────────────────────────────────────┐');
  console.log('│  🔍 CHECKLIST DE VERIFICACIÓN UI              │');
  console.log('└────────────────────────────────────────────────┘');
  console.log('');
  console.log('  ✓ Header verde oliva #3D4436 con "Prop Elite" dorado');
  console.log('  ✓ Tagline "PRIME LIVING" en mayúsculas');
  console.log('  ✓ Tarjeta "Búsqueda Iniciada" centrada');
  console.log('  ✓ Nombre "Diego Villota" visible');
  console.log('  ✓ Operación: compra de Departamento en Cumbayá');
  console.log('  ✓ Presupuesto: $120.000 - $180.000');
  console.log('  ✓ CTA WhatsApp con Paula');
  console.log('');

} catch (err) {
  console.error('❌ Error al enviar:', err.message);
  process.exit(1);
}
