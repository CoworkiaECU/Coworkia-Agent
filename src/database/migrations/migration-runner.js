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
import { execSync }      from 'child_process';
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

// ─── Backup pre-migración ─────────────────────────────────────────────────────

/**
 * Intenta hacer un backup de la base de datos antes de aplicar migraciones.
 * - Local: pg_dump --schema-only → /tmp/coworkia_pre_migration_NNN.sql
 * - Heroku: llama a la API de Heroku Postgres (si HEROKU_API_KEY está disponible)
 *           Si no, loguea el comando manual equivalente.
 * Nunca bloquea la migración — solo advierte si falla.
 */
async function captureBackupBeforeMigration(pendingCount) {
  if (pendingCount === 0) return;

  const isHeroku  = !!process.env.DYNO;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (!isHeroku) {
    // ── Local: pg_dump ──────────────────────────────────────────────────────
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('[MIGRATIONS] ⚠️ DATABASE_URL no definido — backup local omitido');
      return;
    }
    const outFile = `/tmp/coworkia_pre_migration_${timestamp}.sql`;
    try {
      execSync(`pg_dump --schema-only "${dbUrl}" -f "${outFile}"`, { timeout: 30000 });
      console.log(`[MIGRATIONS] 💾 Backup schema guardado en ${outFile}`);
    } catch (err) {
      // pg_dump puede no estar disponible en el ambiente — no bloqueamos
      console.warn('[MIGRATIONS] ⚠️ pg_dump no disponible — backup local omitido:', err.message.split('\n')[0]);
    }
    return;
  }

  // ── Heroku: API backup capture ────────────────────────────────────────────
  const apiKey  = process.env.HEROKU_API_KEY;
  const appName = process.env.HEROKU_APP_NAME || 'coworkia-agent';

  if (!apiKey) {
    console.log(`[MIGRATIONS] 💡 Backup manual recomendado antes de migrar:`);
    console.log(`[MIGRATIONS]    heroku pg:backups:capture --app ${appName}`);
    return;
  }

  try {
    // 1. Obtener el addon de postgres
    const addonsRes = await fetch(`https://api.heroku.com/apps/${appName}/addons`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.heroku+json; version=3'
      }
    });
    if (!addonsRes.ok) throw new Error(`addons API ${addonsRes.status}`);
    const addons  = await addonsRes.json();
    const pgAddon = addons.find(a => a.addon_service?.name?.startsWith('heroku-postgresql'));
    if (!pgAddon) throw new Error('Addon heroku-postgresql no encontrado');

    // 2. Trigger backup en postgres-api.heroku.com
    const resourceName = pgAddon.name;
    const token64      = Buffer.from(`:${apiKey}`).toString('base64');
    const backupRes    = await fetch(
      `https://postgres-api.heroku.com/client/v11/databases/${resourceName}/backups`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${token64}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!backupRes.ok) throw new Error(`backup API ${backupRes.status}`);
    const backup = await backupRes.json();
    console.log(`[MIGRATIONS] 💾 Backup Heroku iniciado — ID: ${backup.num ?? 'N/A'}`);
  } catch (err) {
    // No bloqueamos la migración aunque falle el backup
    console.warn(`[MIGRATIONS] ⚠️ Backup automático falló: ${err.message}`);
    console.log(`[MIGRATIONS] 💡 Backup manual: heroku pg:backups:capture --app ${appName}`);
  }
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

  // Backup antes de aplicar cualquier cambio
  await captureBackupBeforeMigration(pending.length);

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
