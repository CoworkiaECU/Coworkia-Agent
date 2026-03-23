/**
 * 🗄️ migration-runner.js — Sistema de migraciones de base de datos
 *
 * Ejecuta migraciones versionadas en orden. Trackea cuáles ya se aplicaron
 * en la tabla `_migrations`. Seguro para re-ejecutar (idempotente).
 *
 * Uso:
 *   import { runMigrations, getMigrationStatus } from './migration-runner.js';
 *   await runMigrations();          // en boot del servidor
 *   await getMigrationStatus();     // para /migrate status
 */

import { fileURLToPath } from 'url';
import path              from 'path';
import fs                from 'fs';
import databaseService   from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Tabla de registro ────────────────────────────────────────────────────────
const ENSURE_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function ensureTable() {
  await databaseService.ensureInitialized();
  await databaseService.run(ENSURE_TABLE);
}

async function getAppliedMigrations() {
  const rows = await databaseService.all(
    `SELECT name FROM _migrations ORDER BY applied_at ASC`
  );
  return rows.map(r => r.name);
}

function getMigrationFiles() {
  return fs.readdirSync(__dirname)
    .filter(f => /^\d{3}_.*\.js$/.test(f) && f !== 'migration-runner.js' && f !== 'template.js')
    .sort();
}

// ─── Runner principal ─────────────────────────────────────────────────────────
export async function runMigrations() {
  await ensureTable();
  const applied = await getAppliedMigrations();
  const files   = getMigrationFiles();
  const pending = files.filter(f => !applied.includes(f));

  if (pending.length === 0) {
    console.log('[MIGRATIONS] ✅ Base de datos al día — no hay migraciones pendientes');
    return { applied: applied.length, run: 0 };
  }

  console.log(`[MIGRATIONS] 🔄 Ejecutando ${pending.length} migración(es) pendiente(s)...`);
  let ran = 0;

  for (const file of pending) {
    const filePath = path.join(__dirname, file);
    console.log(`[MIGRATIONS] ▶ Aplicando: ${file}`);
    try {
      const { up } = await import(filePath);
      await up(databaseService);
      await databaseService.run(
        `INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [file]
      );
      console.log(`[MIGRATIONS] ✅ ${file} aplicada`);
      ran++;
    } catch (err) {
      console.error(`[MIGRATIONS] ❌ Error en ${file}:`, err.message);
      throw new Error(`Migración fallida: ${file} — ${err.message}`);
    }
  }

  console.log(`[MIGRATIONS] 🎉 ${ran} migración(es) aplicada(s) exitosamente`);
  return { applied: applied.length, run: ran };
}

// ─── Status para comando /migrate ────────────────────────────────────────────
export async function getMigrationStatus() {
  let dbOk = false;
  try {
    await ensureTable();
    dbOk = true;
  } catch {
    return { applied: [], pending: [], dbOk: false };
  }

  const applied = await getAppliedMigrations();
  const files   = getMigrationFiles();
  const pending = files.filter(f => !applied.includes(f));

  return { applied, pending, dbOk };
}

// ─── Rollback (solo dev) ──────────────────────────────────────────────────────
export async function rollbackLast() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Rollback no permitido en producción');
  }
  await ensureTable();
  const applied = await getAppliedMigrations();
  if (applied.length === 0) {
    console.log('[MIGRATIONS] No hay migraciones para revertir');
    return;
  }
  const last     = applied[applied.length - 1];
  const filePath = path.join(__dirname, last);
  console.log(`[MIGRATIONS] ⏪ Revirtiendo: ${last}`);
  const { down } = await import(filePath);
  if (typeof down !== 'function') throw new Error(`${last} no tiene función down()`);
  await down(databaseService);
  await databaseService.run(`DELETE FROM _migrations WHERE name = $1`, [last]);
  console.log(`[MIGRATIONS] ✅ ${last} revertida`);
}
