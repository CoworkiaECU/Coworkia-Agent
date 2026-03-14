/**
 * Fase 3: Migración de prefijos de código secuencial
 * Actualiza registros existentes (test data) con nuevos prefijos
 */

import pg from 'pg';

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Conectado a DB...\n');

  const queries = [
    ["collision_quotes AXEL→AXL",
      "UPDATE collision_quotes SET quote_code = REPLACE(quote_code, 'AXEL-', 'AXL-') WHERE quote_code LIKE 'AXEL-%'"],
    ["insurance_leads SEG→ADR",
      "UPDATE insurance_leads SET quote_code = REPLACE(quote_code, 'SEG-', 'ADR-') WHERE quote_code LIKE 'SEG-%'"],
    ["legal_leads GRC→GAB",
      "UPDATE legal_leads SET consultation_code = REPLACE(consultation_code, 'GRC-', 'GAB-') WHERE consultation_code LIKE 'GRC-%'"],
    ["marketing_leads ML→ENZ",
      "UPDATE marketing_leads SET project_code = REPLACE(project_code, 'ML-', 'ENZ-') WHERE project_code LIKE 'ML-%'"],
    ["reservations RES-WHY→AUR",
      "UPDATE reservations SET id = 'AUR-' || substr(id, 9) WHERE id LIKE 'RES-WHY-%'"],
    ["membership_leads MEM-*→ALU",
      "UPDATE membership_leads SET membership_code = 'ALU-' || to_char(current_date, 'YYYY') || '-' || lpad(regexp_replace(membership_code, '^MEM-\\w+-0*', ''), 4, '0') WHERE membership_code LIKE 'MEM-%'"],
    ["boss_quotes / todos los prefijos",
      `UPDATE boss_quotes SET quote_code = CASE
        WHEN quote_code LIKE 'GRC-%'  THEN REPLACE(quote_code, 'GRC-',  'GAB-')
        WHEN quote_code LIKE 'ML-%'   THEN REPLACE(quote_code, 'ML-',   'ENZ-')
        WHEN quote_code LIKE 'PRE-%'  THEN REPLACE(quote_code, 'PRE-',  'PAU-')
        WHEN quote_code LIKE 'PRO-%'  THEN REPLACE(quote_code, 'PRO-',  'ALU-')
        WHEN quote_code LIKE 'AXEL-%' THEN REPLACE(quote_code, 'AXEL-', 'AXL-')
        WHEN quote_code LIKE 'SEG-%'  THEN REPLACE(quote_code, 'SEG-',  'ADR-')
        ELSE quote_code
      END
      WHERE quote_code IS NOT NULL`],
  ];

  for (const [label, sql] of queries) {
    const result = await client.query(sql);
    console.log(`✅ ${label}: ${result.rowCount} filas actualizadas`);
  }

  await client.end();
  console.log('\n🎉 Migración completa');
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
