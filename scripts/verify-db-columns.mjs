import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const { rows } = await pool.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'reservations' 
  AND column_name IN (
    'followup_1h_sent_at','followup_d1_sent_at','followup_d3_sent_at',
    'reminder_24h_sent_at','reminder_2h_sent_at','no_show_detected_at',
    'rebook_reminder_sent_at','payment_reminder_sent_at','upsell_aluna_sent_at'
  ) ORDER BY column_name
`);
console.log('=== DB COLUMNS (9 expected) ===');
rows.forEach(r => console.log('  ✅', r.column_name));
console.log('Total:', rows.length, '/ 9');

const idx = await pool.query(`
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'reservations' 
  AND indexname LIKE 'idx_res_%'
  ORDER BY indexname
`);
console.log('\n=== PARTIAL INDEXES ===');
idx.rows.forEach(r => console.log('  ✅', r.indexname));
console.log('Total:', idx.rows.length);

await pool.end();
