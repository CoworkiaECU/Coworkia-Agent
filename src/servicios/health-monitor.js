/**
 * 🏥 health-monitor.js — Monitor de salud del sistema
 *
 * Revisa OpenAI y PostgreSQL cada 5 minutos.
 * Solo notifica si el problema persiste en 2 checks consecutivos
 * para evitar spam por fallos transitorios.
 *
 * Uso: llamar startHealthMonitor() en el boot del servidor.
 */

import { notifyCriticalError } from './notification-service.js';
import { query }               from '../database/database.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS  = 5 * 60 * 1000;  // 5 minutos
const FAIL_THRESHOLD     = 2;              // Notificar solo tras N fallos seguidos

// ─── Estado interno ───────────────────────────────────────────────────────────
const failCounters = { openai: 0, db: 0 };
let intervalId = null;

// ─── Checks individuales ──────────────────────────────────────────────────────

async function checkOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[HEALTH] ⚠️ OPENAI_API_KEY no configurada — skip OpenAI check');
    failCounters.openai = 0;
    return true;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok || res.status === 429) {
      // 429 = rate limited → servicio UP
      failCounters.openai = 0;
      return true;
    }

    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    failCounters.openai++;
    console.warn(`[HEALTH] ❌ OpenAI check failed (${failCounters.openai}/${FAIL_THRESHOLD}):`, err.message);

    if (failCounters.openai >= FAIL_THRESHOLD) {
      await notifyCriticalError('Health Monitor — OpenAI', err);
      failCounters.openai = 0; // Reset para no re-notificar en cada ciclo hasta que vuelva a fallar
    }
    return false;
  }
}

async function checkDatabase() {
  try {
    await query('SELECT 1');
    failCounters.db = 0;
    return true;
  } catch (err) {
    failCounters.db++;
    console.warn(`[HEALTH] ❌ DB check failed (${failCounters.db}/${FAIL_THRESHOLD}):`, err.message);

    if (failCounters.db >= FAIL_THRESHOLD) {
      await notifyCriticalError('Health Monitor — PostgreSQL', err);
      failCounters.db = 0;
    }
    return false;
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runChecks() {
  console.log('[HEALTH] 🔍 Ejecutando checks...');
  const [openaiOk, dbOk] = await Promise.all([checkOpenAI(), checkDatabase()]);
  const status = openaiOk && dbOk ? '✅' : '⚠️';
  console.log(`[HEALTH] ${status} OpenAI: ${openaiOk ? 'OK' : 'FAIL'} | DB: ${dbOk ? 'OK' : 'FAIL'}`);
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia el monitor de salud. Llámalo una vez en el boot del servidor.
 */
export function startHealthMonitor() {
  if (intervalId) {
    console.warn('[HEALTH] ⚠️ Monitor ya iniciado — ignorando llamada duplicada');
    return;
  }

  console.log(`[HEALTH] 🏥 Health monitor iniciado (cada ${CHECK_INTERVAL_MS / 60000} min)`);

  // Primer check con pequeño delay (servidor aún levantando)
  setTimeout(() => runChecks(), 30_000);

  intervalId = setInterval(runChecks, CHECK_INTERVAL_MS);
}

/**
 * Detiene el monitor (útil en tests).
 */
export function stopHealthMonitor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[HEALTH] 🛑 Health monitor detenido');
  }
}
