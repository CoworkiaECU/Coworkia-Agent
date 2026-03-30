/**
 * 🔒 Seed: Crear desks permanentes para Diego y Francisco
 * Ejecutar en Heroku: heroku run "node scripts/seed-permanent-desks.mjs"
 */
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seed() {
  const client = await pool.connect();
  try {
    // Crear tabla si no existe (la migración ya la crea, pero por seguridad)
    await client.query(`
      CREATE TABLE IF NOT EXISTS permanent_desks (
        id SERIAL PRIMARY KEY,
        user_phone VARCHAR(50) NOT NULL,
        client_name TEXT NOT NULL,
        hot_desk_number INTEGER NOT NULL,
        membership_lead_id TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Verificar si ya existen
    const existing = await client.query('SELECT * FROM permanent_desks WHERE status = $1', ['active']);
    if (existing.rows.length > 0) {
      console.log('⚠️ Ya existen desks permanentes:');
      existing.rows.forEach(r => console.log(`  #${r.hot_desk_number} — ${r.client_name}`));
      console.log('\nSi quieres re-crear, primero ejecuta:');
      console.log("  DELETE FROM permanent_desks WHERE status = 'active';");
      return;
    }

    // Diego Villota — Desk #1
    await client.query(
      `INSERT INTO permanent_desks (user_phone, client_name, hot_desk_number, start_date, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      ['+593987770788', 'Diego Villota', 1, '2026-01-01', 'Fundador Coworkia — desk permanente']
    );

    // Francisco Zapata — Desk #2
    await client.query(
      `INSERT INTO permanent_desks (user_phone, client_name, hot_desk_number, start_date, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      ['+593998904943', 'Francisco Zapata', 2, '2026-03-01', 'Plan 20 — $100 pagado + $150 canje']
    );

    console.log('✅ Desks permanentes creados:');
    console.log('  #1 — Diego Villota (fundador)');
    console.log('  #2 — Francisco Zapata (Plan 20)');
    console.log('\n📊 Capacidad total: 6 hot desks');
    console.log('🔒 Permanentes: 2 (Diego + Francisco)');
    console.log('✅ Disponibles para reserva: 4 (desks #3-#6)');

  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
