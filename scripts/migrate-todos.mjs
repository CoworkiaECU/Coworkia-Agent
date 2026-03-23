/**
 * Migration: crea tabla todos para el dashboard en tiempo real
 * node scripts/migrate-todos.mjs
 */
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

await pool.query(`
  CREATE TABLE IF NOT EXISTS todos (
    id            SERIAL PRIMARY KEY,
    title         TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','done','blocked')),
    priority      TEXT        NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high','urgent')),
    assigned_agent TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);
console.log('✅ Tabla todos creada (o ya existía)');

// Seed inicial para ver el dashboard funcionando
const count = await pool.query('SELECT COUNT(*) FROM todos');
if (Number(count.rows[0].count) === 0) {
  await pool.query(`
    INSERT INTO todos (title, status, priority, assigned_agent) VALUES
      ('Fix wiring botones pendientes dashboards',  'in_progress', 'urgent',  'aurora'),
      ('adrianaRepository.js KYC columns',          'pending',     'high',    'adriana'),
      ('Aurora Fase 3 métricas semanales',           'pending',     'high',    'aurora'),
      ('wassenger.js handler Adriana conversacional','pending',     'medium',  'adriana'),
      ('Enzo follow-ups D+1/D+3/D+7 frontend',       'pending',     'medium',  'enzo'),
      ('Aurora + Gabi recibo email por reserva',     'pending',     'low',     'gabi')
  `);
  console.log('✅ Seed inicial cargado (6 tareas del backlog)');
}

await pool.end();
console.log('✅ Migration completada');
