// Migración: Agregar campos tracking para automatizaciones Aurora
// Fecha: 26 Mar 2026

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const fields = [
  'followup_d1_sent_at',
  'followup_d3_sent_at',
  'reminder_24h_sent_at',
  'reminder_2h_sent_at',
  'payment_reminder_sent_at',
  'no_show_detected_at',
  'upsell_aluna_sent_at'
];

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_reservations_followup_d1 ON reservations(followup_d1_sent_at) WHERE followup_d1_sent_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_reservations_followup_d3 ON reservations(followup_d3_sent_at) WHERE followup_d3_sent_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_reservations_reminder_24h ON reservations(reminder_24h_sent_at) WHERE reminder_24h_sent_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_reservations_reminder_2h ON reservations(reminder_2h_sent_at) WHERE reminder_2h_sent_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_reservations_no_show ON reservations(no_show_detected_at) WHERE no_show_detected_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_reservations_upsell_aluna ON reservations(upsell_aluna_sent_at) WHERE upsell_aluna_sent_at IS NULL',
];

try {
  for (const field of fields) {
    await pool.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ${field} TIMESTAMP`);
    console.log(`✅ Campo agregado: ${field}`);
  }
  for (const idx of indexes) {
    await pool.query(idx);
    console.log(`✅ Índice creado: ${idx.split(' ')[5]}`);
  }
  
  const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'reservations' AND column_name LIKE '%sent_at' OR column_name LIKE '%detected_at' ORDER BY column_name`);
  console.log(`\n📊 Campos tracking en reservations:`, rows.map(r => r.column_name));
  console.log(`\n🎯 Migración Aurora A1 completada exitosamente`);
} catch (err) {
  console.error('❌ Error en migración:', err.message);
} finally {
  await pool.end();
}
