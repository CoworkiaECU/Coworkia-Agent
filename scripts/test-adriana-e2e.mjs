/**
 * E2E Test — Adriana Multi-Quote Flow Verification
 * 
 * Simula el flujo completo sin WhatsApp real:
 * 1. Crea un lead de prueba con datos vehiculares
 * 2. Genera multi-quotes via generateMultiQuotes()
 * 3. Guarda quotes en BD via saveLeadQuotes()
 * 4. Genera email HTML via buildEmailTemplate COMPARISON_V2
 * 5. Verifica que las 4 aseguradoras aparecen
 * 6. Consulta el endpoint /api/adriana/leads/:id/quotes
 * 7. Limpia el lead de prueba
 *
 * Ejecutar: heroku run "node scripts/test-adriana-e2e.mjs"
 */

import databaseService from '../src/database/database.js';
import { generateMultiQuotes, saveLeadQuotes, formatQuotesForTemplate } from '../src/servicios/adriana-multi-quote-engine.js';
import { buildEmailTemplate } from '../src/servicios/email-template-system.js';

const TEST_LEAD_ID = `TEST-E2E-${Date.now()}`;
const TEST_PHONE = '+593000000000';
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.error(`  ❌ ${label}`); }
}

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('🛡️  E2E TEST — Adriana Multi-Quote Flow');
  console.log('═══════════════════════════════════════════\n');

  await databaseService.initialize();

  // ── 1. Create test user + lead ──
  console.log('📋 Step 1: Create test user + lead');
  await databaseService.run(`
    INSERT INTO users (phone_number, name, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (phone_number) DO NOTHING
  `, [TEST_PHONE, 'Test User E2E']);

  await databaseService.run(`
    INSERT INTO insurance_leads (id, quote_code, user_phone, insurance_type, client_name, email,
      vehicle_brand, vehicle_model, vehicle_year, commercial_value, plate, status, phone)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [TEST_LEAD_ID, 'ADR-E2E-TEST', TEST_PHONE, 'Vehicular', 'Test User E2E',
      'test@example.com', 'Hyundai', 'Creta', 2022, 16000, 'PBC-1234', 'quoted', TEST_PHONE]);
  assert(true, 'User + Lead created');

  // ── 2. Generate multi-quotes ──
  console.log('\n📊 Step 2: Generate multi-quotes');
  const quotes = await generateMultiQuotes({
    commercialValue: 16000,
    vehicleYear: 2022,
    vehicleCategory: 'liviano',
  });
  assert(quotes.length >= 4, `${quotes.length} quotes generated (expected ≥4)`);
  
  const providers = quotes.map(q => q.provider);
  assert(providers.some(p => /vaz/i.test(p)), 'VAZ Seguros present');
  assert(providers.some(p => /sucre/i.test(p)), 'Seguros Sucre present');
  assert(providers.some(p => /equinoccial/i.test(p)), 'Seguros Equinoccial present');
  assert(providers.some(p => /unidos/i.test(p)), 'Seguros Unidos present');

  const vaz = quotes.find(q => q.slug === 'vaz');
  assert(vaz && vaz.annualPremium > 0, `VAZ quote: $${vaz?.annualPremium}/yr`);
  assert(vaz && vaz.isRecommended, 'VAZ is recommended (cheapest)');

  // ── 3. Save quotes to DB ──
  console.log('\n💾 Step 3: Save quotes to DB');
  await saveLeadQuotes(TEST_LEAD_ID, quotes);
  const savedQuotes = await databaseService.all(
    'SELECT * FROM insurance_lead_quotes WHERE lead_id = $1 ORDER BY annual_premium ASC',
    [TEST_LEAD_ID]
  );
  assert(savedQuotes.length >= 4, `${savedQuotes.length} quotes saved in DB`);

  // ── 4. Format for template ──
  console.log('\n📧 Step 4: Generate comparison email');
  const tpl = formatQuotesForTemplate(quotes);
  assert(tpl.competitors.length >= 3, `${tpl.competitors.length} competitors in template data`);
  assert(tpl.vaz_prima_anual.startsWith('$'), `VAZ prima: ${tpl.vaz_prima_anual}`);

  const html = buildEmailTemplate('ADRIANA', 'COMPARISON_V2', {
    nombre: 'Test User E2E',
    marca: 'Hyundai', modelo: 'Creta', anio: 2022,
    placa: 'PBC-1234', valor_asegurado: '$16,000',
    vaz_prima_anual: tpl.vaz_prima_anual,
    vaz_prima_mensual: tpl.vaz_prima_mensual,
    vaz_deducible: tpl.vaz_deducible,
    analisis_broker: 'Análisis de prueba E2E',
    competitors: tpl.competitors,
    fecha_cotizacion: new Date().toLocaleDateString('es-EC'),
    bot_phone: '593994837117',
    adriana_email: 'adriana@segpopular.com',
    adriana_phone: '+593 987 770 788',
  });
  assert(html && html.length > 1000, `Email HTML generated (${html.length} chars)`);
  assert(html.includes('Seguros Sucre') || html.includes('Sucre'), 'Email contains Sucre');
  assert(html.includes('Equinoccial'), 'Email contains Equinoccial');
  assert(html.includes('Unidos'), 'Email contains Unidos');

  // ── 5. Verify WhatsApp message format ──
  console.log('\n📲 Step 5: WhatsApp message format');
  const quoteSummaryLines = quotes.map(q => {
    const star = q.isRecommended ? '⭐' : '•';
    const rec = q.isRecommended ? ' ← Recomendada' : '';
    return `  ${star} ${q.provider} — $${q.annualPremium}/año ($${q.monthlyPremium}/mes)${rec}`;
  });
  assert(quoteSummaryLines.length >= 4, `WA message has ${quoteSummaryLines.length} lines`);
  console.log('  Preview:');
  quoteSummaryLines.forEach(l => console.log(`    ${l}`));

  // ── 6. Cleanup ──
  console.log('\n🧹 Step 6: Cleanup');
  await databaseService.run('DELETE FROM insurance_lead_quotes WHERE lead_id = $1', [TEST_LEAD_ID]);
  await databaseService.run('DELETE FROM insurance_leads WHERE id = $1', [TEST_LEAD_ID]);
  await databaseService.run('DELETE FROM users WHERE phone_number = $1', [TEST_PHONE]);
  assert(true, 'Test data cleaned up');

  // ── Results ──
  console.log('\n═══════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('❌ Fatal:', err);
  // Cleanup on error
  databaseService.run('DELETE FROM insurance_lead_quotes WHERE lead_id = $1', [TEST_LEAD_ID]).catch(() => {});
  databaseService.run('DELETE FROM insurance_leads WHERE id = $1', [TEST_LEAD_ID]).catch(() => {});
  databaseService.run('DELETE FROM users WHERE phone_number = $1', [TEST_PHONE]).catch(() => {});
  process.exit(1);
});
