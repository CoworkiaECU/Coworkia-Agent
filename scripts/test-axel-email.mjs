#!/usr/bin/env node
/**
 * 🧪 TEST EMAIL — Axel / The PaintBull
 *
 * USO:
 *   node scripts/test-axel-email.mjs <email-destino>
 *
 * EJEMPLO:
 *   node scripts/test-axel-email.mjs yo@diegovillota.com
 */

import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from '../src/servicios/email.js';
import { generateEmailForAgent } from '../src/servicios/generic-email-templates.js';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log(`
USO:
  node scripts/test-axel-email.mjs <email>

EJEMPLO:
  node scripts/test-axel-email.mjs yo@diegovillota.com
`);
  process.exit(0);
}

const testEmail = args[0];

if (!testEmail.includes('@')) {
  console.error('❌ Email inválido');
  process.exit(1);
}

const leadData = {
  clientName:   'Diego Villota',
  fullName:     'Diego Villota',
  quoteCode:    'COL-2026-0001',
  email:        testEmail,
  phone:        '+593 99 483 7117',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Corolla',
  vehicleYear:  '2021',
  damageType:   'Colisión trasera',
  damageAnalysis: {
    severity:       'MODERADO',
    details:        'Paragolpes trasero deformado, guardafango derecho con abolladura de 15cm, luz trasera derecha quebrada',
    parts:          'Paragolpes trasero, guardafango derecho, luz trasera derecha',
    risk:           'Medio — posibles daños ocultos en chasis',
    estimatedDays:  '5 a 7 días hábiles'
  },
  quoteDetails: 'Enderezada y pintura paragolpes trasero + guardafango derecho + luz trasera nueva',
  priceMin: 450,
  priceMax: 680,
  photoCount: 4
};

console.log('');
console.log('┌────────────────────────────────────────────────┐');
console.log('│  🧪 INICIANDO TEST EMAIL AXEL                 │');
console.log('└────────────────────────────────────────────────┘');
console.log('');
console.log(`📧 Destinatario:  ${testEmail}`);
console.log(`🚗 Vehículo:      ${leadData.vehicleBrand} ${leadData.vehicleModel} ${leadData.vehicleYear}`);
console.log(`🔨 Daño:          ${leadData.damageType}`);
console.log('');
console.log('⏳ Enviando email de prueba...');
console.log('');

try {
  const { subject, html } = generateEmailForAgent('AXEL', 'client', leadData);

  await sendEmail({
    to:      testEmail,
    subject: subject,
    html,
    from:    { name: AGENT_FROM_NAMES?.axel || 'Axel - The PaintBull', address: DEFAULT_FROM_EMAIL },
  });

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ✅ EMAIL AXEL ENVIADO CORRECTAMENTE         ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📬 Asunto: ${subject}`);
  console.log(`📧 Enviado a: ${testEmail}`);
  console.log('');
  console.log('┌────────────────────────────────────────────────┐');
  console.log('│  🔍 CHECKLIST DE VERIFICACIÓN UI              │');
  console.log('└────────────────────────────────────────────────┘');
  console.log('');
  console.log('  ✓ Header rojo #DC2626 con logo diana PaintBull');
  console.log('  ✓ Nombre "Diego Villota" en tarjeta superior');
  console.log('  ✓ Código de cotización COL-2026-0001');
  console.log('  ✓ Sección vehículo: Toyota Corolla 2021');
  console.log('  ✓ Badge de severidad MODERADO (amarillo)');
  console.log('  ✓ Cotización detallada con trabajos requeridos');
  console.log('  ✓ Rango de precio: $450 - $680 USD');
  console.log('  ✓ CTA WhatsApp funcional');
  console.log('');

} catch (err) {
  console.error('❌ Error al enviar:', err.message);
  process.exit(1);
}
