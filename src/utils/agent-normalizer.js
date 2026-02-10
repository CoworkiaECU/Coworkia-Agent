/**
 * 🎯 Agent Name Normalizer
 * Garantiza consistencia en nombres de agentes (SIEMPRE MAYÚSCULAS)
 * Previene duplicación de registros por inconsistencia aurora vs AURORA
 */

const VALID_AGENTS = [
  'AURORA',
  'ALUNA',
  'ADRIANA',
  'ENZO',
  'ANGELA',
  'AXEL',
  'GABI',
  'PAULA'
];

/**
 * Normaliza nombre de agente a MAYÚSCULAS
 * @param {string} agent - Nombre del agente (puede ser minúscula/mayúscula/mixto)
 * @returns {string} - Nombre normalizado en MAYÚSCULAS o 'AURORA' si inválido
 */
export function normalizeAgentName(agent) {
  if (!agent) {
    console.warn('[AGENT-NORMALIZER] ⚠️ Agent is null/undefined, defaulting to AURORA');
    return 'AURORA';
  }
  
  const upper = String(agent).toUpperCase().trim();
  
  // Validar que sea un agente válido
  if (VALID_AGENTS.includes(upper)) {
    return upper;
  }
  
  console.warn(`[AGENT-NORMALIZER] ⚠️ Invalid agent "${agent}", defaulting to AURORA`);
  return 'AURORA';
}

/**
 * Verifica si un nombre de agente es válido
 * @param {string} agent - Nombre del agente
 * @returns {boolean} - true si es válido
 */
export function isValidAgent(agent) {
  if (!agent) return false;
  const upper = String(agent).toUpperCase().trim();
  return VALID_AGENTS.includes(upper);
}

/**
 * Obtiene lista de todos los agentes válidos
 * @returns {string[]} - Array de nombres de agentes en MAYÚSCULAS
 */
export function getValidAgents() {
  return [...VALID_AGENTS];
}
