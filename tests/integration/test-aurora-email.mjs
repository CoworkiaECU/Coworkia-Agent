#!/usr/bin/env node
/**
 * 🧪 TEST EMAIL — Aurora / Coworkia Reservas
 *
 * USO:
 *   node scripts/test-aurora-email.mjs <email-destino>
 *
 * EJEMPLO:
 *   node scripts/test-aurora-email.mjs yo@diegovillota.com
 */

import { sendReservationConfirmation } from '../src/servicios/email.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('USO: node scripts/test-aurora-email.mjs <email>');
  process.exit(0);
}

const testEmail = args[0];

const reservationData = {
  email:         testEmail,
  userName:      'Diego Villota',
  date:          '2026-03-15',
  startTime:     '09:00',
  endTime:       '11:00',
  durationHours: 2,
  serviceType:   'hotDesk',
  wasFree:       false,
  totalPrice:    10.07,
  reservation: {
    id: 'RES-2026-0042'
  },
  paymentReceipt: null,
  wifiCode:      null
};

console.log('');
console.log('┌────────────────────────────────────────────────┐');
console.log('│  🧪 INICIANDO TEST EMAIL AURORA               │');
console.log('└────────────────────────────────────────────────┘');
console.log('');
console.log(`📧 Destinatario:  ${testEmail}`);
console.log(`🏢 Servicio:      Hot Desk`);
console.log(`📅 Fecha:         15 de marzo 2026`);
console.log(`🕐 Horario:       9:00am – 11:00am (2h)`);
console.log(`💵 Total:         $10.07`);
console.log('');
console.log('⏳ Enviando email de prueba...');

try {
  const result = await sendReservationConfirmation(reservationData);

  if (result?.success === false) {
    console.error('❌ Error:', result.error);
    process.exit(1);
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ✅ EMAIL AURORA ENVIADO CORRECTAMENTE       ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`📧 Enviado a: ${testEmail}`);
  console.log('');
  console.log('┌────────────────────────────────────────────────┐');
  console.log('│  🔍 CHECKLIST DE VERIFICACIÓN UI              │');
  console.log('└────────────────────────────────────────────────┘');
  console.log('');
  console.log('  ✓ Header gradiente teal #5DE5DB → #3B9177');
  console.log('  ✓ "Coworkia BUSINESS CENTER" en header');
  console.log('  ✓ "✅ ¡Reserva Confirmada!" en tarjeta blanca');
  console.log('  ✓ Nombre "Diego Villota" personalizado');
  console.log('  ✓ Código RES-2026-0042 visible');
  console.log('  ✓ Fecha y horario del servicio');
  console.log('  ✓ Sección de pago (Payphone / Transferencia)');
  console.log('  ✓ Botón WhatsApp con Aurora');
  console.log('  ✓ Ecosistema de agentes en footer');
  console.log('');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
