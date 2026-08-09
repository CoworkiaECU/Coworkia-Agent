/**
 * 🏥 health-monitor.js — Monitor de salud del sistema
 *
 * Revisa OpenAI, PostgreSQL, Wassenger y RAM cada 10 minutos.
 * Solo notifica si el problema persiste en 2 checks consecutivos
 * para evitar spam por fallos transitorios.
 *
 * Uso: llamar startHealthMonitor() en el boot del servidor.
 * API:  getLastStatus() → snapshot del último check (para /status WA)
 */

import { notifyCriticalError } from './notification-service.js';
import { query }               from '../database/database.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS  = 10 * 60 * 1000; // 10 minutos (ahorra llamadas en eco dyno)
const FAIL_THRESHOLD     = 2;              // Notificar solo tras N fallos seguidos
const RAM_WARN_MB        = 450;            // Alerta si RSS supera este umbral

// ─── Estado interno ───────────────────────────────────────────────────────────
const failCounters = { openai: 0, db: 0, wassenger: 0 };
let intervalId = null;
let _lastStatus = { checkedAt: null, openai: 'unknown', db: 'unknown', wassenger: 'unknown', ramMB: 0 };

// ─── Checks individuales ──────────────────────────────────────────────────────

async function checkOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[HEALTH] ⚠️ OPENAI_API_KEY no configurada — skip OpenAI check');
    failCounters.openai = 0;
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s — margen para red de eco dyno

  try {
    const res = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    if (res.ok || res.status === 429) {
      // 429 = rate limited → servicio UP
      failCounters.openai = 0;
      return true;
    }

    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (err.name === 'AbortError') {
      // Timeout de red: OpenAI lento pero no necesariamente caído — no genera ERROR CRÍTICO
      console.warn('[HEALTH] ⏱️ OpenAI check timeout (>15s) — lentitud de red, no se genera alerta');
      return false;
    }

    failCounters.openai++;
    console.warn(`[HEALTH] ❌ OpenAI check failed (${failCounters.openai}/${FAIL_THRESHOLD}):`, err.message);

    if (failCounters.openai >= FAIL_THRESHOLD) {
      await notifyCriticalError('Health Monitor — OpenAI', err);
      failCounters.openai = 0; // Reset para no re-notificar en cada ciclo hasta que vuelva a fallar
    }
    return false;
  } finally {
    clearTimeout(timeout);
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

async function checkWassenger() {
  const token = process.env.WASSENGER_TOKEN || process.env.WASSENGER_API_KEY;
  if (!token) {
    failCounters.wassenger = 0; // Sin token = no monitorear
    return true;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://api.wassenger.com/v1/account', {
      headers: { Token: token },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // 401/403 = token inválido (servicio UP), 5xx = servicio caído
    if (res.status < 500) {
      failCounters.wassenger = 0;
      return true;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (err.name === 'AbortError') {
      failCounters.wassenger++;
      console.warn(`[HEALTH] ❌ Wassenger timeout (${failCounters.wassenger}/${FAIL_THRESHOLD})`);
    } else {
      failCounters.wassenger++;
      console.warn(`[HEALTH] ❌ Wassenger check failed (${failCounters.wassenger}/${FAIL_THRESHOLD}):`, err.message);
    }
    if (failCounters.wassenger >= FAIL_THRESHOLD) {
      await notifyCriticalError('Health Monitor — Wassenger', err);
      failCounters.wassenger = 0;
    }
    return false;
  }
}

function checkRAM() {
  const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
  if (rss > RAM_WARN_MB) {
    console.warn(`[HEALTH] ⚠️ RAM alta: ${rss}MB (umbral: ${RAM_WARN_MB}MB)`);
    notifyCriticalError('Health Monitor — RAM Alta', new Error(`RSS: ${rss}MB`)).catch(() => {});
  }
  return rss;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runChecks() {
  console.log('[HEALTH] 🔍 Ejecutando checks...');
  const [openaiOk, dbOk, wassengerOk] = await Promise.all([
    checkOpenAI(), checkDatabase(), checkWassenger()
  ]);
  const ramMB = checkRAM();
  const status = openaiOk && dbOk ? '✅' : '⚠️';
  console.log(`[HEALTH] ${status} OpenAI: ${openaiOk ? 'OK' : 'FAIL'} | DB: ${dbOk ? 'OK' : 'FAIL'} | Wassenger: ${wassengerOk ? 'OK' : 'FAIL'} | RAM: ${ramMB}MB`);
  _lastStatus = { checkedAt: new Date().toISOString(), openai: openaiOk ? 'ok' : 'fail', db: dbOk ? 'ok' : 'fail', wassenger: wassengerOk ? 'ok' : 'fail', ramMB };
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

/**
 * Devuelve el snapshot del último check (para el comando /status desde WA).
 */
export function getLastStatus() {
  return { ..._lastStatus };
}

/** @internal Solo para tests unitarios */
export function _resetCountersForTest() {
  failCounters.openai = 0;
  failCounters.db = 0;
  failCounters.wassenger = 0;
}

/** @internal Solo para tests unitarios */
export { checkOpenAI as _checkOpenAI };
