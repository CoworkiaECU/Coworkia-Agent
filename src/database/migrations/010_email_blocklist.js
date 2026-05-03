/**
 * 010_email_blocklist.js
 *
 * Tabla genérica de emails bloqueados (rebotados o marcados como inválidos).
 * Sirve para TODOS los agentes — el filtro vive en sendEmail() centralizado.
 *
 * Comportamiento:
 *  - bounce_count: cuántas veces ha rebotado este email
 *  - blocked: TRUE si está activamente bloqueado (auto si bounce_count >= 2 o hard bounce)
 *  - reason: 'soft_bounce' | 'hard_bounce' | 'manual' | 'invalid_address'
 */

export async function up(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS email_blocklist (
      id              SERIAL PRIMARY KEY,
      email           TEXT NOT NULL UNIQUE,
      reason          TEXT NOT NULL DEFAULT 'manual',
      bounce_count    INTEGER NOT NULL DEFAULT 0,
      blocked         BOOLEAN NOT NULL DEFAULT TRUE,
      last_error      TEXT,
      last_agent      TEXT,
      first_bounced_at TIMESTAMPTZ,
      last_bounced_at  TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`CREATE INDEX IF NOT EXISTS idx_email_blocklist_email ON email_blocklist(LOWER(email))`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_email_blocklist_blocked ON email_blocklist(blocked)`);

  console.log('[MIGRATION 010] ✅ email_blocklist creada');
}

export async function down(db) {
  await db.run(`DROP TABLE IF EXISTS email_blocklist`);
  console.log('[MIGRATION 010] ⬇️ Reverted');
}
