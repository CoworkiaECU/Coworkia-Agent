#!/usr/bin/env node
/**
 * 🧪 TEST EMAIL — Enzo MarketingLab
 *
 * Envía un email REAL de prueba con el template completo de Enzo.
 *
 * USO:
 *   node scripts/test-enzo-email.mjs [email-destino]
 *
 * EJEMPLO:
 *   node scripts/test-enzo-email.mjs yo@diegovillota.com
 */

import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from '../src/servicios/email.js';
import { generateEmailForAgent } from '../src/servicios/generic-email-templates.js';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log(`
USO:
  node scripts/test-enzo-email.mjs <email>

EJEMPLO:
  node scripts/test-enzo-email.mjs yo@diegovillota.com
`);
  process.exit(0);
}

const testEmail = args[0];

if (!testEmail.includes('@')) {
  console.error('❌ Email inválido');
  process.exit(1);
}

// ─── Datos de prueba realistas ──────────────────────────────────────────────
const leadData = {
  userName:    'Diego Villota',
  projectType: 'Campaña Digital',
  companyName: 'Coworkia Ecuador',
  email:       testEmail,
  phone:       '+593 99 483 7117',
  budget:      '$1.500 - $3.000 / mes',
  urgency:     'Alta — queremos lanzar en 2 semanas',
  description: 'Necesitamos posicionar Coworkia como el mejor business center de Quito: campañas en Meta Ads, contenido para redes y email marketing para la base de clientes.',
  leadId:      'ML-2026-0005',
};

console.log('');
console.log('┌────────────────────────────────────────────────┐');
console.log('│  🧪 INICIANDO TEST EMAIL ENZO                 │');
console.log('└────────────────────────────────────────────────┘');
console.log('');
console.log(`📧 Destinatario:  ${testEmail}`);
console.log(`🎯 Proyecto:      ${leadData.projectType}`);
console.log(`🏢 Empresa:       ${leadData.companyName}`);
console.log('');
console.log('⏳ Enviando email de prueba...');
console.log('');

try {
  const { subject, html } = generateEmailForAgent('ENZO', 'client', leadData);

  await sendEmail({
    to:      testEmail,
    subject: subject,
    html,
    from:    { name: AGENT_FROM_NAMES.enzo, address: DEFAULT_FROM_EMAIL },
  });

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ✅ EMAIL ENZO ENVIADO CORRECTAMENTE         ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📬 Asunto: ${subject}`);
  console.log(`📧 Enviado a: ${testEmail}`);
  console.log('');
  console.log('┌────────────────────────────────────────────────┐');
  console.log('│  🔍 CHECKLIST DE VERIFICACIÓN UI              │');
  console.log('└────────────────────────────────────────────────┘');
  console.log('');
  console.log('  ✓ Header dark navy #0A0F1E + "marketinglab" en lime green');
  console.log('  ✓ Tagline "ESTRATEGIAS QUE FUNCIONAN" en blanco tenue');
  console.log('  ✓ Nombre "Diego Villota" en tarjeta blanca centrada');
  console.log('  ✓ Badge lime con código ML-2026-0005');
  console.log('  ✓ Detalles del proyecto (tipo, empresa, presupuesto)');
  console.log('  ✓ CTA WhatsApp funcional');
  console.log('  ✓ Ecosistema de agentes (dark, edge-to-edge)');
  console.log('  ✓ Footer #374151 con "MarketingLab"');
  console.log('');

} catch (err) {
  console.error('❌ Error al enviar:', err.message);
  process.exit(1);
}
