#!/usr/bin/env node
/**
 * 🧪 TEST EMAIL — Gabi / Asesoría Legal y Contable
 *
 * USO:
 *   node scripts/test-gabi-email.mjs <email-destino>
 */

import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from '../src/servicios/email.js';
import { generateEmailForAgent } from '../src/servicios/generic-email-templates.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('USO: node scripts/test-gabi-email.mjs <email>');
  process.exit(0);
}

const testEmail = args[0];

const clientData = {
  clientName:       'Diego Villota',
  consultationCode: 'LEG-2026-001',
  consultationType: 'Constitución de Empresa SAS',
  urgency:          'Normal',
  meetingDate:      '48 horas',
  calendarLink:     null,
};

console.log('');
console.log('┌────────────────────────────────────────────────┐');
console.log('│  🧪 INICIANDO TEST EMAIL GABI                 │');
console.log('└────────────────────────────────────────────────┘');
console.log('');
console.log(`📧 Destinatario:  ${testEmail}`);
console.log(`⚖️  Consulta:      ${clientData.consultationType}`);
console.log('');
console.log('⏳ Enviando email de prueba...');

try {
  const { subject, html } = generateEmailForAgent('GABI', 'client', clientData);

  await sendEmail({
    to:      testEmail,
    subject: subject,
    html,
    from: { name: AGENT_FROM_NAMES?.gabi || 'Gabi - Asesoría Legal', address: DEFAULT_FROM_EMAIL },
  });

  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ✅ EMAIL GABI ENVIADO CORRECTAMENTE         ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`📬 Asunto: ${subject}`);
  console.log(`📧 Enviado a: ${testEmail}`);
  console.log('');

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
