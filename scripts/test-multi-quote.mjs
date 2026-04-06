/**
 * Test del motor multi-quote con auto $16,000 (Hyundai Creta 2022)
 * Ejecutar: heroku run "node scripts/test-multi-quote.mjs"
 */

import { generateMultiQuotes, formatQuotesForTemplate } from '../src/servicios/adriana-multi-quote-engine.js';

const testCase = {
  commercialValue: 16000,
  vehicleYear: 2022,
  vehicleCategory: 'liviano',
};

console.log('═══════════════════════════════════════════');
console.log('🛡️  TEST MULTI-QUOTE ENGINE');
console.log(`🚗  Auto $${testCase.commercialValue.toLocaleString()} — Año ${testCase.vehicleYear}`);
console.log('═══════════════════════════════════════════\n');

const quotes = await generateMultiQuotes(testCase);

console.log(`📊 ${quotes.length} cotizaciones generadas:\n`);
for (const q of quotes) {
  const star = q.isRecommended ? '⭐' : '  ';
  console.log(`${star} ${q.provider.padEnd(22)} | Plan: ${q.plan.padEnd(24)} | Anual: $${String(q.annualPremium).padStart(6)} | Mensual: $${String(q.monthlyPremium).padStart(4)} | Ded: ${q.deductiblePct}% | Asist: ${q.hasRoadside ? '✅' : '❌'} | Reemplazo: ${q.hasReplacementVehicle ? '✅' : '❌'} | Src: ${q.source}`);
}

console.log('\n── Template format ──\n');
const tpl = formatQuotesForTemplate(quotes);
console.log('VAZ Prima Anual:', tpl.vaz_prima_anual);
console.log('VAZ Prima Mensual:', tpl.vaz_prima_mensual);
console.log('VAZ Deducible:', tpl.vaz_deducible);
console.log('Competitors:', tpl.competitors.length);
for (const c of tpl.competitors) {
  console.log(`  → ${c.nombre} | ${c.plan} | ${c.prima_anual} | ${c.prima_mensual} | Ded: ${c.deducible} | Asist: ${c.asistencia}`);
}

// WA message preview
console.log('\n── WhatsApp message preview ──\n');
const quoteSummaryLines = quotes.length > 1
  ? quotes.map(q => {
      const star = q.isRecommended ? '⭐' : '•';
      const rec = q.isRecommended ? ' ← *Recomendada*' : '';
      return `  ${star} ${q.provider} — *$${q.annualPremium.toLocaleString()}/año* ($${q.monthlyPremium}/mes)${rec}`;
    })
  : [];
console.log(`📊 *Comparativa de ${quotes.length} aseguradoras:*`);
quoteSummaryLines.forEach(l => console.log(l));

console.log('\n✅ Test completado');
process.exit(0);
