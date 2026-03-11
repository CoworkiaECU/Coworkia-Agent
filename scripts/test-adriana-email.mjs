#!/usr/bin/env node
/**
 * 🧪 TEST EMAIL — Adriana / SegPopular
 *
 * USO:
 *   node scripts/test-adriana-email.mjs <email-destino>
 *
 * EJEMPLO:
 *   node scripts/test-adriana-email.mjs yo@diegovillota.com
 */

import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from '../src/servicios/email.js';
import { generateEmailForAgent } from '../src/servicios/generic-email-templates.js';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log(`
USO:
  node scripts/test-adriana-email.mjs <email>

EJEMPLO:
  node scripts/test-adriana-email.mjs yo@diegovillota.com
`);
  process.exit(0);
}

const testEmail = args[0];

if (!testEmail.includes('@')) {
  console.error('❌ Email inválido');
  process.exit(1);
}

const leadData = {
  clientName:    'Diego Villota',
  fullName:      'Diego Villota',
  leadId:        'SEG-2026-0001',
  insuranceType: 'Seguro Todo Riesgo',
  cedula:        '1712345678',
  email:         testEmail,
  phone:         '+593 99 483 7117',
  vehicleBrand:  'Toyota',
  vehicleModel:  'Corolla',
  vehicleYear:   '2021',
  plate:         'PBB-1234',
  motor:         'ABC123456',
  chasis:        'XYZ789012345',
  originCountry: 'Japón',
  city:          'Quito',
  commercialValue: 18000,
  licenseType:   'Tipo B',
  licenseExpiry: '2027-06-15',
  quotedPremium: 810,
  basePremium:   720,
  iva:           86.4,
  emissionCost:  3.6,
  otherCosts:    0
};

console.log('');
console.log('┌────────────────────────────────────────────────┐');
console.log('│  🧪 INICIANDO TEST EMAIL ADRIANA              │');
console.log('└────────────────────────────────────────────────┘');
console.log('');
console.log(`📧 Destinatario:  ${testEmail}`);
console.log(`🚗 Vehículo:      ${leadData.vehicleBrand} ${leadData.vehicleModel} ${leadData.vehicleYear}`);
console.log(`🛡️  Seguro:        ${leadData.insuranceType}`);
console.log(`💵 Prima total:   $${leadData.quotedPremium}`);
console.log('');
console.log('⏳ Enviando email de prueba...');
console.log('');

try {
  const { subject, html } = generateEmailForAgent('ADRIANA', 'client', leadData);

  await sendEmail({
    to:      testEmail,
    subject: subject,
    html,
    from:    { name: AGENT_FROM_NAMES?.adriana || 'Adriana - SegPopular', address: DEFAULT_FROM_EMAIL },
  });

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ✅ EMAIL ADRIANA ENVIADO CORRECTAMENTE      ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📬 Asunto: ${subject}`);
  console.log(`📧 Enviado a: ${testEmail}`);
  console.log('');
  console.log('┌────────────────────────────────────────────────┐');
  console.log('│  🔍 CHECKLIST DE VERIFICACIÓN UI              │');
  console.log('└────────────────────────────────────────────────┘');
  console.log('');
  console.log('  ✓ Header azul marino #1E3A8A con logo SegPopular');
  console.log('  ✓ Nombre "Diego Villota" visible');
  console.log('  ✓ Código SEG-2026-0001');
  console.log('  ✓ Tipo de seguro: Todo Riesgo');
  console.log('  ✓ Datos del vehículo: Toyota Corolla 2021');
  console.log('  ✓ Prima total: $810');
  console.log('  ✓ Desglose: base $720 + IVA $86.40');
  console.log('');

} catch (err) {
  console.error('❌ Error al enviar:', err.message);
  process.exit(1);
}
