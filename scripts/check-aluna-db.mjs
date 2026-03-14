import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query("SELECT id, membership_code, client_name, created_at FROM membership_leads ORDER BY created_at DESC LIMIT 10");
console.log('Total rows:', r.rowCount);
for (const row of r.rows) {
  console.log(`id=${row.id} | membership_code=${row.membership_code} | name=${row.client_name}`);
}
await c.end();
