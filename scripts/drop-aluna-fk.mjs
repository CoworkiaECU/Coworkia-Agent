/**
 * drop-aluna-fk.mjs
 * Elimina la FK constraint de aluna_prospect_followups → users
 * ya que los prospectos pueden ser personas que nunca usaron el bot WA.
 */
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// Find the FK constraint name
const fkRes = await client.query(`
  SELECT conname FROM pg_constraint
  WHERE conrelid = 'aluna_prospect_followups'::regclass AND contype = 'f'
`);
console.log('FK constraints found:', fkRes.rows.map(r => r.conname));

for (const row of fkRes.rows) {
  await client.query(`ALTER TABLE aluna_prospect_followups DROP CONSTRAINT IF EXISTS "${row.conname}"`);
  console.log(`✅ Dropped FK: ${row.conname}`);
}

await client.end();
console.log('Done.');
