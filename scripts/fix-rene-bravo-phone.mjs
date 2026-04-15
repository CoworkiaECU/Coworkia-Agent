/**
 * 🔧 Fix phone format for René Bravo (info@electrobv.com)
 * Normalizes 0999469826 → +593999469826 across all agent tables
 * 
 * One-time script — run with: heroku run "node scripts/fix-rene-bravo-phone.mjs" --app coworkia-agent
 */
import pg from 'pg';

const client = new pg.Client({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

await client.connect();

const OLD_PHONE = '0999469826';
const NEW_PHONE = '+593999469826';
const EMAIL = 'info@electrobv.com';

console.log(`🔧 Fixing phone: ${OLD_PHONE} → ${NEW_PHONE} for ${EMAIL}\n`);

// 1. boss_quotes
const bq = await client.query(
  `UPDATE boss_quotes SET client_phone = $1 WHERE client_email = $2 AND (client_phone = $3 OR client_phone IS NULL)`,
  [NEW_PHONE, EMAIL, OLD_PHONE]
);
console.log(`✅ boss_quotes: ${bq.rowCount} rows updated`);

// 2. membership_leads (Aluna)
const ml = await client.query(
  `UPDATE membership_leads SET phone = $1 WHERE email = $2 AND phone = $3`,
  [NEW_PHONE, EMAIL, OLD_PHONE]
);
console.log(`✅ membership_leads: ${ml.rowCount} rows updated`);

// 3. marketing_leads (Enzo)
const mk = await client.query(
  `UPDATE marketing_leads SET phone = $1 WHERE client_email = $2 AND phone = $3`,
  [NEW_PHONE, EMAIL, OLD_PHONE]
);
console.log(`✅ marketing_leads: ${mk.rowCount} rows updated`);

// 4. collision_quotes (Axel)
const cq = await client.query(
  `UPDATE collision_quotes SET phone = $1 WHERE email = $2 AND phone = $3`,
  [NEW_PHONE, EMAIL, OLD_PHONE]
);
console.log(`✅ collision_quotes: ${cq.rowCount} rows updated`);

// 5. aluna_prospect_followups (if exists)
try {
  const apf = await client.query(
    `UPDATE aluna_prospect_followups SET user_phone = $1 WHERE email = $2 AND user_phone = $3`,
    [NEW_PHONE, EMAIL, OLD_PHONE]
  );
  console.log(`✅ aluna_prospect_followups: ${apf.rowCount} rows updated`);
} catch (e) {
  console.log(`⚠️ aluna_prospect_followups: ${e.message}`);
}

// Verify
const verify = await client.query(
  `SELECT 'boss_quotes' as tbl, client_phone as phone FROM boss_quotes WHERE client_email = $1
   UNION ALL
   SELECT 'membership_leads', phone FROM membership_leads WHERE email = $1
   UNION ALL  
   SELECT 'marketing_leads', phone FROM marketing_leads WHERE client_email = $1
   UNION ALL
   SELECT 'collision_quotes', phone FROM collision_quotes WHERE email = $1`,
  [EMAIL]
);
console.log('\n📋 Verification:');
for (const row of verify.rows) {
  console.log(`  ${row.tbl}: ${row.phone}`);
}

console.log('\n✅ Done!');
await client.end();
