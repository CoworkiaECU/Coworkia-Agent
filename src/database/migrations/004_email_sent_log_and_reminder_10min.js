/**
 * 004_email_sent_log_and_reminder_10min.js
 * 
 * - Agrega columna reminder_10min_sent_at a reservations
 * - Crea tabla email_sent_log para trackear emails enviados por agente
 */

export async function up(db) {
  // 1. Columna de recordatorio 10 min antes de reserva
  await db.run(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_10min_sent_at TIMESTAMP`);

  // 2. Tabla de log de emails enviados (para aislamiento multi-agente en replies)
  await db.run(`
    CREATE TABLE IF NOT EXISTS email_sent_log (
      id SERIAL PRIMARY KEY,
      message_id TEXT NOT NULL,
      agent TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      to_email TEXT NOT NULL,
      subject TEXT,
      user_phone TEXT,
      sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`CREATE INDEX IF NOT EXISTS idx_email_sent_log_message_id ON email_sent_log(message_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_email_sent_log_agent ON email_sent_log(agent)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_email_sent_log_to ON email_sent_log(to_email)`);

  console.log('[MIGRATION 004] ✅ email_sent_log + reminder_10min_sent_at');
}

export async function down(db) {
  await db.run(`ALTER TABLE reservations DROP COLUMN IF EXISTS reminder_10min_sent_at`);
  await db.run(`DROP TABLE IF EXISTS email_sent_log`);
  console.log('[MIGRATION 004] ⬇️ Reverted');
}
