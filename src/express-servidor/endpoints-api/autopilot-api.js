/**
 * 🤖 Autopilot Checkpoint API
 *
 * Endpoints que permiten al agente Copilot (corriendo en VS Code) comunicarse
 * con Diego desde su celular durante ejecuciones de autopilot.
 *
 * FLUJO:
 * 1. Copilot termina un bloque → POST /api/autopilot/checkpoint
 *    → Server guarda en DB + envía WA a Diego con opciones
 * 2. Diego responde desde WA (SIGUIENTE / PARA / DEPLOY / SKIP)
 *    → wassenger.js escribe la respuesta en DB
 * 3. Copilot pollea → GET /api/autopilot/checkpoint-answer
 *    → Recibe la respuesta y decide si continuar / parar / deployar
 *
 * SEGURIDAD:
 * - Requiere Authorization: Bearer <CHECKPOINT_SECRET> en todas las rutas
 * - CHECKPOINT_SECRET es una variable de entorno (no hardcodeada)
 */

import express          from 'express';
import { query }        from '../../database/database.js';
import { notifyRaw }    from '../../servicios/notification-service.js';

const router = express.Router();

// ─── Middleware de autenticación ─────────────────────────────────────────────

function requireCheckpointSecret(req, res, next) {
  const secret = process.env.CHECKPOINT_SECRET;
  if (!secret) {
    console.warn('[AUTOPILOT-API] ⚠️ CHECKPOINT_SECRET no configurado — endpoint deshabilitado');
    return res.status(503).json({ ok: false, error: 'CHECKPOINT_NOT_CONFIGURED' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== secret) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  next();
}

// ─── Helpers DB ───────────────────────────────────────────────────────────────

async function ensureCheckpointTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS _autopilot_checkpoints (
      id         SERIAL PRIMARY KEY,
      block_name TEXT NOT NULL,
      message    TEXT NOT NULL,
      command    TEXT,              -- null hasta que Diego responde
      asked_at   TIMESTAMP DEFAULT NOW(),
      answered_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )
  `);
}

// ─── POST /api/autopilot/checkpoint ──────────────────────────────────────────

/**
 * Registra un checkpoint: guarda en DB y envía WA a Diego.
 *
 * Body: { blockName: string, message?: string, timeoutMinutes?: number }
 *
 * Respuesta: { ok: true, checkpointId: number }
 */
router.post('/api/autopilot/checkpoint', requireCheckpointSecret, async (req, res) => {
  const { blockName, message, timeoutMinutes = 15 } = req.body || {};

  if (!blockName) {
    return res.status(400).json({ ok: false, error: 'blockName requerido' });
  }

  try {
    await ensureCheckpointTable();

    // Expirar checkpoints anteriores
    await query(`
      UPDATE _autopilot_checkpoints
      SET command = 'EXPIRED', answered_at = NOW()
      WHERE command IS NULL AND expires_at > NOW()
    `);

    // Insertar nuevo checkpoint
    const result = await query(
      `INSERT INTO _autopilot_checkpoints (block_name, message, expires_at)
       VALUES ($1, $2, NOW() + $3 * INTERVAL '1 minute')
       RETURNING id`,
      [blockName, message || blockName, timeoutMinutes]
    );
    const checkpointId = result.rows[0].id;

    // Mensaje WA para Diego
    const waMsg = [
      `✅ *Bloque completado:* ${blockName}`,
      ``,
      `¿Qué hago?`,
      ``,
      `▶️ *SIGUIENTE* — continuar al próximo bloque`,
      `🚀 *DEPLOY* — deployar a Heroku y continuar`,
      `⏸️ *SKIP* — saltar este bloque`,
      `🛑 *PARA* — pausar el autopilot`,
      ``,
      `⏱️ _Auto-continúa en ${timeoutMinutes} min si no respondes_`
    ].join('\n');

    await notifyRaw(waMsg);

    console.log(`[AUTOPILOT-API] ✅ Checkpoint #${checkpointId} registrado: ${blockName}`);
    res.json({ ok: true, checkpointId });

  } catch (err) {
    console.error('[AUTOPILOT-API] ❌ Error en checkpoint:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/autopilot/checkpoint-answer ────────────────────────────────────

/**
 * Devuelve el estado del checkpoint más reciente.
 *
 * Respuesta:
 *   { ok: true, status: 'waiting' }                    — sin respuesta aún
 *   { ok: true, status: 'answered', command: 'SIGUIENTE' }
 *   { ok: true, status: 'expired' }                    — timeout sin respuesta
 *   { ok: true, status: 'none' }                       — no hay checkpoint activo
 */
router.get('/api/autopilot/checkpoint-answer', requireCheckpointSecret, async (req, res) => {
  try {
    await ensureCheckpointTable();

    const result = await query(
      `SELECT id, block_name, command, asked_at, answered_at, expires_at
       FROM _autopilot_checkpoints
       ORDER BY asked_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ ok: true, status: 'none' });
    }

    const row = result.rows[0];
    const now = new Date();

    if (row.command) {
      const status = row.command === 'EXPIRED' ? 'expired' : 'answered';
      return res.json({ ok: true, status, command: row.command, blockName: row.block_name });
    }

    // Sin respuesta — verificar si expiró
    if (new Date(row.expires_at) < now) {
      // Marcar expirado
      await query(
        `UPDATE _autopilot_checkpoints SET command = 'EXPIRED', answered_at = NOW() WHERE id = $1`,
        [row.id]
      );
      return res.json({ ok: true, status: 'expired', blockName: row.block_name });
    }

    const secsLeft = Math.round((new Date(row.expires_at) - now) / 1000);
    return res.json({ ok: true, status: 'waiting', blockName: row.block_name, secsLeft });

  } catch (err) {
    console.error('[AUTOPILOT-API] ❌ Error en checkpoint-answer:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── DELETE /api/autopilot/checkpoint ────────────────────────────────────────

/**
 * Limpia los checkpoints respondidos (cleanup opcional).
 */
router.delete('/api/autopilot/checkpoint', requireCheckpointSecret, async (req, res) => {
  try {
    await ensureCheckpointTable();
    await query(`DELETE FROM _autopilot_checkpoints WHERE command IS NOT NULL`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/self-healing/latest ─────────────────────────────────────────────

/**
 * Obtiene el último reporte de Self-Healing System.
 * Usado por Copilot al inicio de sesión para verificar si hay errores pendientes.
 *
 * Respuesta: { ok: true, report: {...} | null }
 */
router.get('/api/self-healing/latest', async (req, res) => {
  try {
    const report = await query(
      `SELECT report_date, errors_found, conversations_failed, plan_file, summary, status
       FROM self_healing_reports
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!report.rows || report.rows.length === 0) {
      return res.json({ ok: true, report: null });
    }

    const r = report.rows[0];
    res.json({
      ok: true,
      report: {
        date: r.report_date,
        errorsFound: parseInt(r.errors_found || 0),
        conversationsFailed: parseInt(r.conversations_failed || 0),
        planFile: r.plan_file || '',
        summary: r.summary || '',
        status: r.status || 'pending'
      }
    });
  } catch (err) {
    console.error('[SELF-HEALING-API] ❌ Error obteniendo reporte:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/autotraining/latest ─────────────────────────────────────────────

/**
 * Obtiene el último reporte de autotraining para un agente específico o todos.
 * Query params: ?agent=aurora (opcional — sin agent retorna todos los últimos)
 *
 * Respuesta: { ok: true, reports: [...] }
 */
router.get('/api/autotraining/latest', async (req, res) => {
  try {
    const { agent } = req.query;

    let sql, params;
    if (agent) {
      sql = `SELECT agent, report_date, total_conversations, success_count, failed_count,
                    successful_patterns, failed_patterns, suggestions, health_score, summary, applied
             FROM autotraining_reports
             WHERE agent = $1
             ORDER BY report_date DESC
             LIMIT 1`;
      params = [agent];
    } else {
      // Último reporte de cada agente
      sql = `SELECT DISTINCT ON (agent)
                    agent, report_date, total_conversations, success_count, failed_count,
                    successful_patterns, failed_patterns, suggestions, health_score, summary, applied
             FROM autotraining_reports
             ORDER BY agent, report_date DESC`;
      params = [];
    }

    const result = await query(sql, params);

    if (!result.rows || result.rows.length === 0) {
      return res.json({ ok: true, reports: [] });
    }

    const reports = result.rows.map(r => ({
      agent: r.agent,
      date: r.report_date,
      totalConversations: parseInt(r.total_conversations || 0),
      successCount: parseInt(r.success_count || 0),
      failedCount: parseInt(r.failed_count || 0),
      successfulPatterns: r.successful_patterns || [],
      failedPatterns: r.failed_patterns || [],
      suggestions: r.suggestions || [],
      healthScore: parseInt(r.health_score ?? -1),
      summary: r.summary || '',
      applied: r.applied || false,
    }));

    res.json({ ok: true, reports });
  } catch (err) {
    console.error('[AUTOTRAINING-API] ❌ Error obteniendo reporte:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
