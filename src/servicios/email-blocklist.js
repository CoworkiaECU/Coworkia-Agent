/**
 * 📛 email-blocklist.js
 *
 * Servicio centralizado para gestionar emails bloqueados (rebotados o inválidos).
 * Usado por sendEmail() en src/servicios/email.js como filtro previo + handler de bounces.
 */

import databaseService from '../database/database.js';

/**
 * Normaliza un email para comparación case-insensitive.
 */
function norm(email) {
  return (email || '').trim().toLowerCase();
}

/**
 * Detecta si un email ya está en blocklist y activo.
 * @param {string} email
 * @returns {Promise<{blocked: boolean, reason?: string, bounce_count?: number}>}
 */
export async function isBlocked(email) {
  const e = norm(email);
  if (!e) return { blocked: false };
  try {
    await databaseService.ensureInitialized();
    const row = await databaseService.get(
      `SELECT email, reason, bounce_count, blocked
         FROM email_blocklist
        WHERE LOWER(email) = $1
        LIMIT 1`,
      [e]
    );
    if (row && row.blocked) {
      return { blocked: true, reason: row.reason, bounce_count: row.bounce_count };
    }
    return { blocked: false };
  } catch (err) {
    console.warn('[BLOCKLIST] ⚠️ Error consultando blocklist (fail-open):', err.message);
    return { blocked: false };
  }
}

/**
 * Agrega o actualiza un email en blocklist (manual o automático).
 * @param {string} email
 * @param {object} opts
 * @param {string} opts.reason  'manual' | 'soft_bounce' | 'hard_bounce' | 'invalid_address'
 * @param {string} [opts.lastError]
 * @param {string} [opts.agent]
 */
export async function addToBlocklist(email, { reason = 'manual', lastError = null, agent = null } = {}) {
  const e = norm(email);
  if (!e) return { ok: false, error: 'empty email' };
  try {
    await databaseService.ensureInitialized();
    await databaseService.run(
      `INSERT INTO email_blocklist (email, reason, blocked, last_error, last_agent, first_bounced_at, last_bounced_at)
       VALUES ($1, $2, TRUE, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO UPDATE SET
         reason          = EXCLUDED.reason,
         blocked         = TRUE,
         last_error      = COALESCE(EXCLUDED.last_error, email_blocklist.last_error),
         last_agent      = COALESCE(EXCLUDED.last_agent, email_blocklist.last_agent),
         last_bounced_at = CURRENT_TIMESTAMP,
         updated_at      = CURRENT_TIMESTAMP`,
      [e, reason, lastError, agent]
    );
    console.log(`[BLOCKLIST] 🚫 Email bloqueado: ${e} (${reason})`);
    return { ok: true };
  } catch (err) {
    console.error('[BLOCKLIST] ❌ Error agregando a blocklist:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Registra un bounce de un email. Auto-bloquea si:
 *  - reason === 'hard_bounce' (siempre)
 *  - bounce_count alcanza HARD_LIMIT (default 2)
 * @param {string} email
 * @param {object} opts
 * @param {string} opts.reason  'soft_bounce' | 'hard_bounce'
 * @param {string} opts.lastError
 * @param {string} [opts.agent]
 */
const HARD_LIMIT = 2;

export async function recordBounce(email, { reason, lastError, agent = null }) {
  const e = norm(email);
  if (!e) return { ok: false, error: 'empty email' };
  try {
    await databaseService.ensureInitialized();
    // Upsert con incremento de contador
    const row = await databaseService.get(
      `SELECT bounce_count, blocked FROM email_blocklist WHERE LOWER(email) = $1`,
      [e]
    );
    const newCount = (row?.bounce_count || 0) + 1;
    const shouldBlock = reason === 'hard_bounce' || newCount >= HARD_LIMIT;

    await databaseService.run(
      `INSERT INTO email_blocklist (email, reason, bounce_count, blocked, last_error, last_agent, first_bounced_at, last_bounced_at)
       VALUES ($1, $2, 1, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO UPDATE SET
         reason          = EXCLUDED.reason,
         bounce_count    = email_blocklist.bounce_count + 1,
         blocked         = email_blocklist.blocked OR $3,
         last_error      = EXCLUDED.last_error,
         last_agent      = COALESCE(EXCLUDED.last_agent, email_blocklist.last_agent),
         last_bounced_at = CURRENT_TIMESTAMP,
         updated_at      = CURRENT_TIMESTAMP`,
      [e, reason, shouldBlock, lastError, agent]
    );

    if (shouldBlock) {
      console.log(`[BLOCKLIST] 🚫 Auto-bloqueado: ${e} (${reason}, count=${newCount})`);
    } else {
      console.log(`[BLOCKLIST] ⚠️ Bounce registrado: ${e} (${reason}, count=${newCount}/${HARD_LIMIT})`);
    }
    return { ok: true, blocked: shouldBlock, bounce_count: newCount };
  } catch (err) {
    console.error('[BLOCKLIST] ❌ Error registrando bounce:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Quita un email de la blocklist (perdón / desbloqueo manual).
 */
export async function removeFromBlocklist(email) {
  const e = norm(email);
  if (!e) return { ok: false, error: 'empty email' };
  try {
    await databaseService.ensureInitialized();
    await databaseService.run(
      `UPDATE email_blocklist SET blocked = FALSE, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = $1`,
      [e]
    );
    console.log(`[BLOCKLIST] ✅ Desbloqueado: ${e}`);
    return { ok: true };
  } catch (err) {
    console.error('[BLOCKLIST] ❌ Error desbloqueando:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Lista todas las entradas (para endpoint admin).
 */
export async function listBlocklist({ onlyBlocked = false } = {}) {
  try {
    await databaseService.ensureInitialized();
    const where = onlyBlocked ? 'WHERE blocked = TRUE' : '';
    const rows = await databaseService.all(
      `SELECT email, reason, bounce_count, blocked, last_error, last_agent,
              first_bounced_at, last_bounced_at, created_at, updated_at
         FROM email_blocklist
         ${where}
         ORDER BY last_bounced_at DESC NULLS LAST, created_at DESC`
    );
    return rows || [];
  } catch (err) {
    console.error('[BLOCKLIST] ❌ Error listando blocklist:', err.message);
    return [];
  }
}

/**
 * Clasifica un error de Nodemailer/SMTP en hard_bounce | soft_bounce | other.
 * - Hard: códigos 5xx semánticos (mailbox no existe, dominio inválido)
 * - Soft: timeouts, 421, 4xx (server caído, rate limit)
 * - Other: errores de auth/config locales — NO se contabilizan como bounce
 */
export function classifyEmailError(error) {
  if (!error) return { type: 'other' };
  const code = error.responseCode || error.code || '';
  const message = (error.response || error.message || '').toString();
  const lower = message.toLowerCase();

  // Errores locales (auth, config, transporter) — no contar
  if (['EAUTH', 'ECONNECTION', 'ESOCKET', 'EDNS'].includes(error.code)) {
    if (error.code === 'EDNS') {
      // EDNS = dominio del destinatario no resuelve → hard
      return { type: 'hard_bounce', reason: 'dns_lookup_failed' };
    }
    return { type: 'other', reason: error.code };
  }

  // Hard bounces (códigos 5xx semánticos)
  if (typeof code === 'number' && code >= 500 && code < 600) {
    return { type: 'hard_bounce', reason: `smtp_${code}` };
  }
  if (/no such user|user unknown|mailbox.*not.*found|recipient.*rejected|invalid recipient|address rejected/.test(lower)) {
    return { type: 'hard_bounce', reason: 'recipient_rejected' };
  }

  // Soft bounces (timeouts, 4xx, deferrals)
  if (typeof code === 'number' && code >= 400 && code < 500) {
    return { type: 'soft_bounce', reason: `smtp_${code}` };
  }
  if (/timed out|timeout|try again|temporary|deferred|greylisted/.test(lower)) {
    return { type: 'soft_bounce', reason: 'timeout_or_deferred' };
  }
  if (error.code === 'EENVELOPE') {
    return { type: 'hard_bounce', reason: 'envelope_rejected' };
  }

  return { type: 'other', reason: error.code || 'unknown' };
}

export default {
  isBlocked,
  addToBlocklist,
  recordBounce,
  removeFromBlocklist,
  listBlocklist,
  classifyEmailError,
};
