/**
 * migrate-aluna-pipeline.mjs
 * 
 * 1. Agrega columnas faltantes a aluna_prospect_followups
 * 2. Actualiza CREATE TABLE en postgres-adapter para futuros deployments
 * 3. Backfill: registra en pipeline los leads existentes en membership_leads
 *    que aún no están en aluna_prospect_followups
 * 
 * Usage: node scripts/migrate-aluna-pipeline.mjs
 */

import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log('=== MIGRACIÓN: aluna_prospect_followups ===\n');

// ── 1. Agregar columnas faltantes ──────────────────────────────────────────
const MISSING_COLUMNS = [
  ['membership_code',          'TEXT'],
  ['email',                    'TEXT'],
  ['followup_24h_email_sent_at','TIMESTAMP'],
  ['followup_3d_email_sent_at', 'TIMESTAMP'],
];

for (const [col, type] of MISSING_COLUMNS) {
  try {
    await client.query(`ALTER TABLE aluna_prospect_followups ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    console.log(`  ✅ Columna añadida: ${col} ${type}`);
  } catch (e) {
    console.log(`  ⚠️  ${col}: ${e.message}`);
  }
}

// ── 2. Backfill desde membership_leads ────────────────────────────────────
console.log('\n=== BACKFILL: membership_leads → aluna_prospect_followups ===\n');

const leads = await client.query(`
  SELECT ml.membership_code, ml.client_name, ml.phone, ml.user_phone, ml.email, ml.membership_type, ml.status, ml.created_at,
         ml.special_requirements
  FROM membership_leads ml
  ORDER BY ml.created_at DESC
`);

console.log(`  Total leads en membership_leads: ${leads.rows.length}`);

// Para admin-created leads el seguimiento debe ir al phone del CLIENTE
for (const lead of leads.rows) {
  try {
    const isAdmin = (lead.special_requirements || '').toLowerCase().includes('admin') ||
                    (lead.special_requirements || '').toLowerCase().includes('big boss') ||
                    (lead.special_requirements || '').toLowerCase().includes('administrador');

    // Normalizar teléfono del cliente a formato +593...
    let clientPhone = lead.phone || lead.user_phone;
    if (!clientPhone) { console.log(`  ⚠️ Sin teléfono para ${lead.client_name}`); continue; }
    // Si empieza con 09 → +5939...
    if (/^09\d{8}$/.test(clientPhone)) clientPhone = '+593' + clientPhone.slice(1);
    // Si empieza con 9 y 9 dígitos → +5939...  
    else if (/^9\d{8}$/.test(clientPhone)) clientPhone = '+593' + clientPhone;

    const convertedAt = (['active','accepted'].includes(lead.status)) ? lead.created_at : null;
    
    await client.query(`
      INSERT INTO aluna_prospect_followups 
        (user_phone, user_name, membership_type, membership_code, email, interest_at, converted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_phone) DO UPDATE SET
        user_name       = COALESCE(EXCLUDED.user_name, aluna_prospect_followups.user_name),
        membership_type = COALESCE(EXCLUDED.membership_type, aluna_prospect_followups.membership_type),
        membership_code = COALESCE(EXCLUDED.membership_code, aluna_prospect_followups.membership_code),
        email           = COALESCE(EXCLUDED.email, aluna_prospect_followups.email)
    `, [clientPhone, lead.client_name, lead.membership_type, lead.membership_code, lead.email, lead.created_at, convertedAt]);
    
    console.log(`  ✅ ${lead.client_name} → ${clientPhone} (${lead.membership_type} / ${lead.status})${isAdmin ? ' [BigBoss]' : ''}`);
  } catch (e) {
    console.log(`  ❌ Error con ${lead.client_name}: ${e.message}`);
  }
}

// Limpiar la entrada errónea del admin-phone si quedó y no corresponde a ningún cliente
await client.query(`
  DELETE FROM aluna_prospect_followups 
  WHERE user_phone NOT LIKE '+593%' 
     OR (user_phone IN (SELECT DISTINCT user_phone FROM membership_leads) AND
         user_phone NOT IN (SELECT phone FROM membership_leads WHERE phone IS NOT NULL))
`).catch(() => {});

// ── 3. Verificación final ──────────────────────────────────────────────────
const finalCount = await client.query('SELECT COUNT(*) FROM aluna_prospect_followups');
console.log(`\n✅ Total prospectos en pipeline ahora: ${finalCount.rows[0].count}`);

const sample = await client.query(`
  SELECT user_phone, user_name, membership_type, converted_at, interest_at
  FROM aluna_prospect_followups ORDER BY interest_at DESC LIMIT 10
`);
sample.rows.forEach(r => console.log('  ', JSON.stringify(r)));

await client.end();
console.log('\nMigración completada.');
