#!/usr/bin/env node
/**
 * 🧪 TEST PLAN PILOTO — Email Aluna Proforma
 * 
 * Envía un email REAL de prueba con todos los elementos funcionales:
 * - Template completo con todos los componentes UI
 * - Footer unificado Coworkia
 * - Logos, colores, estructura completa
 * - CTA funcional de WhatsApp
 * - Sección ecosistema de agentes
 * 
 * USO:
 * node scripts/test-aluna-email.mjs [email-destino] [plan]
 * 
 * EJEMPLOS:
 * node scripts/test-aluna-email.mjs diego@example.com plan10
 * node scripts/test-aluna-email.mjs test@gmail.com plan20
 * node scripts/test-aluna-email.mjs diego@example.com oficinavirtual
 * 
 * PLANES DISPONIBLES: plan10, plan20, oficinavirtual, salareuniones
 */

import { sendAlunaProforma, PLAN_DATA } from '../src/servicios/aluna-proforma-email.js';

// ═══════════════════════════════════════════════
// 📋 Configuración del test
// ═══════════════════════════════════════════════

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
┌─────────────────────────────────────────────────┐
│  🧪 TEST EMAIL ALUNA - PLAN PILOTO             │
└─────────────────────────────────────────────────┘

USO:
  node scripts/test-aluna-email.mjs <email> [plan]

PARÁMETROS:
  email  : Email donde recibirás el test
  plan   : plan10 | plan20 | oficinavirtual | salareuniones
           (default: plan10)

EJEMPLOS:
  node scripts/test-aluna-email.mjs diego@coworkia.ec
  node scripts/test-aluna-email.mjs test@gmail.com plan20
  node scripts/test-aluna-email.mjs admin@company.com oficinavirtual

PLANES DISPONIBLES:
  • plan10         — $140/mes, 10 días + 1 gratis
  • plan20         — $250/mes, 20 días + 2 gratis
  • oficinavirtual — $365/año, dirección comercial
  • salareuniones  — $39/sesión, 2 horas

VERIFICA EN EL EMAIL:
  ✅ Logo y header con gradiente verde
  ✅ Todos los beneficios del plan
  ✅ CTA de WhatsApp funcional
  ✅ Sección ecosistema de agentes
  ✅ Footer unificado Coworkia
  ✅ Código de proforma generado
  ✅ Ubicación con mapa Google Maps
  ✅ Todos los elementos responsivos
`);
  process.exit(0);
}

const testEmail = args[0];
const testPlan = args[1] || 'plan10';

// Validación básica de email
if (!testEmail.includes('@')) {
  console.error('❌ Error: Email inválido. Debe contener @');
  process.exit(1);
}

// Validación de plan
if (!PLAN_DATA[testPlan]) {
  console.error(`❌ Error: Plan "${testPlan}" no existe.`);
  console.error(`Planes disponibles: ${Object.keys(PLAN_DATA).join(', ')}`);
  process.exit(1);
}

// ═══════════════════════════════════════════════
// 🚀 Ejecutar test
// ═══════════════════════════════════════════════

console.log('');
console.log('┌────────────────────────────────────────────────┐');
console.log('│  🧪 INICIANDO TEST EMAIL ALUNA                │');
console.log('└────────────────────────────────────────────────┘');
console.log('');
console.log(`📧 Destinatario:  ${testEmail}`);
console.log(`📋 Plan:          ${PLAN_DATA[testPlan].name}`);
console.log(`💰 Precio:        ${PLAN_DATA[testPlan].price}`);
console.log(`📅 Modalidad:     ${PLAN_DATA[testPlan].days}`);
console.log('');
console.log('⏳ Enviando email de prueba...');
console.log('');

try {
  const result = await sendAlunaProforma({
    clientName: 'Diego Villota',
    clientEmail: testEmail,
    planKey: testPlan,
    nota: null,
    fromAdmin: true
  });

  if (result.success) {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  ✅ EMAIL ENVIADO CORRECTAMENTE               ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    console.log(`📬 Código Proforma:  ${result.proformaCode}`);
    console.log(`📧 Enviado a:        ${testEmail}`);
    console.log(`📋 Plan:             ${result.planName}`);
    console.log('');
    console.log('┌────────────────────────────────────────────────┐');
    console.log('│  🔍 CHECKLIST DE VERIFICACIÓN UI              │');
    console.log('└────────────────────────────────────────────────┘');
    console.log('');
    console.log('Revisa en tu bandeja de entrada:');
    console.log('');
    console.log('  ✓ Header con gradiente verde oscuro (#047857)');
    console.log('  ✓ Logo "Coworkia" y badge de confirmación');
    console.log('  ✓ Saludo personalizado con nombre');
    console.log('  ✓ Tarjeta del plan con icono 🎫');
    console.log('  ✓ Precio destacado y detalles (días, horas)');
    console.log('  ✓ Sección "Todo lo que incluye" con beneficios');
    console.log('  ✓ Badge "Secretaria Virtual con IA" (si aplica)');
    console.log('  ✓ CTA "Quiero Empezar Ahora" (WhatsApp)');
    console.log('  ✓ Mapa de ubicación con botón Google Maps');
    console.log('  ✓ Código de proforma destacado');
    console.log('  ✓ Nota del equipo (amarilla)');
    console.log('  ✓ Sección "Ecosistema de agentes"');
    console.log('  ✓ Footer unificado Coworkia (verde)');
    console.log('  ✓ Responsive design (prueba en móvil)');
    console.log('');
    console.log('┌────────────────────────────────────────────────┐');
    console.log('│  📱 PRUEBAS ADICIONALES                        │');
    console.log('└────────────────────────────────────────────────┘');
    console.log('');
    console.log('  1. Verifica en MÓVIL (Gmail app, Outlook app)');
    console.log('  2. Verifica en DESKTOP (Gmail web, Outlook web)');
    console.log('  3. Prueba el botón de WhatsApp (debe abrir chat)');
    console.log('  4. Prueba el mapa (debe abrir Google Maps)');
    console.log('  5. Verifica colores en modo oscuro del email client');
    console.log('');
    console.log('🎯 Si todo se ve correcto, da VERDENENA para ajustes finales');
    console.log('');
  } else {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  ❌ ERROR AL ENVIAR EMAIL                     ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    console.log(`Error: ${result.error}`);
    console.log('');
    process.exit(1);
  }
} catch (error) {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ❌ EXCEPCIÓN NO CONTROLADA                   ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.error(error);
  console.log('');
  process.exit(1);
}
