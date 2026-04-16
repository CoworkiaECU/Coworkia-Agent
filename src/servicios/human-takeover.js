// src/servicios/human-takeover.js
// Human Takeover Detection — pausa el bot cuando Diego responde manualmente

/** @type {Map<string, {pausedAt: number, resumeAt: number}>} */
const humanTakeovers = new Map();

/**
 * Pausa el bot para un userId (Diego tomó el control manualmente).
 * @param {string} userId - Número de teléfono del cliente
 * @param {number} durationMinutes - Minutos de pausa (default 30)
 */
export function pauseBot(userId, durationMinutes = 30) {
  if (!userId) return;
  const now = Date.now();
  humanTakeovers.set(userId, {
    pausedAt: now,
    resumeAt: now + durationMinutes * 60 * 1000
  });
  console.log(`[TAKEOVER] ⏸️ Bot pausado para ${userId} por ${durationMinutes}min`);
}

/**
 * Reactiva el bot manualmente para un userId.
 * @param {string} userId - Número de teléfono del cliente
 */
export function resumeBot(userId) {
  if (!userId) return;
  const deleted = humanTakeovers.delete(userId);
  if (deleted) {
    console.log(`[TAKEOVER] ▶️ Bot reactivado para ${userId}`);
  }
}

/**
 * Limpia todos los takeovers activos.
 * @returns {number} Cantidad de takeovers limpiados
 */
export function resumeAll() {
  const count = humanTakeovers.size;
  humanTakeovers.clear();
  if (count > 0) {
    console.log(`[TAKEOVER] ▶️ Bot reactivado para TODOS (${count} conversaciones)`);
  }
  return count;
}

/**
 * Retorna true si el bot está pausado para este userId.
 * Limpia entries expirados automáticamente.
 * @param {string} userId - Número de teléfono del cliente
 * @returns {boolean}
 */
export function isBotPaused(userId) {
  if (!userId) return false;
  cleanExpired();
  const entry = humanTakeovers.get(userId);
  if (!entry) return false;
  if (Date.now() >= entry.resumeAt) {
    humanTakeovers.delete(userId);
    console.log(`[TAKEOVER] ⏰ Pausa expirada para ${userId}, bot reactivado`);
    return false;
  }
  return true;
}

/**
 * Limpia entries vencidos del Map.
 */
export function cleanExpired() {
  const now = Date.now();
  for (const [userId, entry] of humanTakeovers.entries()) {
    if (now >= entry.resumeAt) {
      humanTakeovers.delete(userId);
      console.log(`[TAKEOVER] ⏰ Pausa expirada para ${userId} (cleanup)`);
    }
  }
}

/**
 * Retorna snapshot del estado actual (para debug/status).
 * @returns {Array<{userId: string, pausedAt: Date, resumeAt: Date, remainingMin: number}>}
 */
export function getActiveTakeovers() {
  cleanExpired();
  const result = [];
  const now = Date.now();
  for (const [userId, entry] of humanTakeovers.entries()) {
    result.push({
      userId,
      pausedAt: new Date(entry.pausedAt),
      resumeAt: new Date(entry.resumeAt),
      remainingMin: Math.round((entry.resumeAt - now) / 60000)
    });
  }
  return result;
}
