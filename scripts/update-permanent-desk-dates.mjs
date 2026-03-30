// scripts/update-permanent-desk-dates.mjs
// One-time: Set correct end_date for Diego (April 1) and Francisco (April 19)
import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// Diego Villota — desk #1, expires April 1 2026
const r1 = await client.query(
  `UPDATE permanent_desks SET end_date = '2026-04-01' WHERE hot_desk_number = 1 AND status = 'active' RETURNING id, client_name, end_date`
);
console.log('Diego:', r1.rows);

// Francisco Zapata — desk #2, expires April 19 2026
const r2 = await client.query(
  `UPDATE permanent_desks SET end_date = '2026-04-19' WHERE hot_desk_number = 2 AND status = 'active' RETURNING id, client_name, end_date`
);
console.log('Francisco:', r2.rows);

await client.end();
console.log('✅ End dates updated');
