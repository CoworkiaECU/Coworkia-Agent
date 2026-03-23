import { buildEmailTemplate } from '../src/servicios/email-template-system.js';
import { calculateVehiclePremium } from '../src/servicios/adriana-quote-calculator.js';

// Test 1: Email template checks
const html = buildEmailTemplate('adriana', 'COMPARISON_V2', {
  nombre: 'Javier Andrade',
  marca: 'Hyundai', modelo: 'Creta', anio: '2022',
  valor_asegurado: '$42,000',
  vaz_prima_anual: '$1,101',
  vaz_prima_mensual: '$92',
  vaz_deducible: '7%',
});

const checks = [
  ['benefits section present', html.includes('LO QUE INCLUYE TU PÓLIZA')],
  ['auto sustituto section', html.includes('AUTO SUSTITUTO')],
  ['SUV compacto (vehículo ≥$40k)', html.includes('SUV compacto manual')],
  ['12 meses payment', html.includes('12 meses')],
  ['green CTA present', html.includes('Quiero este seguro')],
  ['ADRIANA RECOMIENDA badge', html.includes('ADRIANA RECOMIENDA')],
  ['no co-brand VAZ', !html.includes('SegPopular S.A. · VAZ Seguros')],
  ['SegPopular logo', html.includes('segpopular.png')],
  ['conductor designado benefit', html.includes('Conductor designado')],
  ['grúa ilimitada benefit', html.includes('Grúa ilimitada')],
];

console.log('=== EMAIL TEMPLATE CHECKS ===');
checks.forEach(([name, ok]) => console.log(`${ok ? '✅' : '❌'} ${name}`));
console.log('HTML length:', html.length);

// Test 2: Calculator /12 fix
console.log('\n=== CALCULATOR /12 CHECK ===');
const r = calculateVehiclePremium({ commercialValue: 16000, vehicleYear: 2022, vehicleCategory: 'light', coverage: 'standard', insurer: 'VAZ' });
if (r.success) {
  const expectedMonthly = Math.round(r.annual_total / 12);
  console.log(`Annual: $${r.annual_total}`);
  console.log(`Monthly (÷12): $${expectedMonthly}`);
  console.log(`Calculator returns: $${r.monthly_installment}`);
  console.log(r.monthly_installment === expectedMonthly ? '✅ /12 confirmed' : '❌ Still /10 or wrong');
} else {
  console.log('❌ Calculator error:', r.error);
}

// Test 3: Javier Andrade $42,000
const r2 = calculateVehiclePremium({ commercialValue: 42000, vehicleYear: 2022, vehicleCategory: 'light', coverage: 'standard', insurer: 'VAZ' });
if (r2.success) {
  console.log(`\nJavier Andrade $42,000 → Plan: ${r2.rate_bracket} @ ${r2.rate}`);
  console.log(`Annual: $${r2.annual_total}, Monthly: $${r2.monthly_installment}`);
}
