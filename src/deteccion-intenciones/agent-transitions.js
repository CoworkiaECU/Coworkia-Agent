/**
 * 🔄 TRANSICIONES DE AGENTES - Sistema Multiagente
 * 
 * Define qué transiciones entre agentes están permitidas.
 * 
 * REGLA ACTUALIZADA (30 Ene 2026):
 * - Cualquier agente puede ir a cualquier otro agente directamente
 * - Sin restricciones, todas las transiciones son válidas
 * - Usuario tiene control total con @menciones
 * 
 * @author Aurora Core - Coworkia
 */

/**
 * Matriz de transiciones válidas entre agentes
 * Cada agente puede ir a todos los demás directamente
 */
export const VALID_TRANSITIONS = {
  'AURORA': ['ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI', 'PAULA'],
  'ALUNA': ['AURORA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI', 'PAULA'],
  'ADRIANA': ['AURORA', 'ALUNA', 'ENZO', 'ANGELA', 'AXEL', 'GABI', 'PAULA'],
  'ENZO': ['AURORA', 'ALUNA', 'ADRIANA', 'ANGELA', 'AXEL', 'GABI', 'PAULA'],
  'ANGELA': ['AURORA', 'ALUNA', 'ADRIANA', 'ENZO', 'AXEL', 'GABI', 'PAULA'],
  'AXEL': ['AURORA', 'ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'GABI', 'PAULA'],
  'GABI': ['AURORA', 'ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'PAULA'],
  'PAULA': ['AURORA', 'ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI']
};

/**
 * Todos los agentes válidos del sistema
 */
export const VALID_AGENTS = [
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
 * Valida si una transición entre agentes es permitida
 * @param {string} fromAgent - Agente origen
 * @param {string} toAgent - Agente destino
 * @returns {boolean} - true si la transición es válida
 */
export function validateTransition(fromAgent, toAgent) {
  // Validar que ambos agentes existen
  if (!VALID_AGENTS.includes(fromAgent) || !VALID_AGENTS.includes(toAgent)) {
    console.warn(`[TRANSITIONS] Agente inválido: ${fromAgent} → ${toAgent}`);
    return false;
  }
  
  // No permitir transición a sí mismo
  if (fromAgent === toAgent) {
    console.warn(`[TRANSITIONS] Transición a sí mismo bloqueada: ${fromAgent} → ${toAgent}`);
    return false;
  }
  
  // Verificar si está en la matriz
  const allowedTargets = VALID_TRANSITIONS[fromAgent];
  const isValid = allowedTargets && allowedTargets.includes(toAgent);
  
  if (!isValid) {
    console.warn(`[TRANSITIONS] Transición no permitida: ${fromAgent} → ${toAgent}`);
  }
  
  return isValid;
}

/**
 * Obtiene los agentes disponibles desde un agente específico
 * @param {string} fromAgent - Agente actual
 * @returns {string[]} - Lista de agentes disponibles
 */
export function getAvailableAgents(fromAgent) {
  if (!VALID_AGENTS.includes(fromAgent)) {
    console.warn(`[TRANSITIONS] Agente inválido: ${fromAgent}`);
    return [];
  }
  
  return VALID_TRANSITIONS[fromAgent] || [];
}

/**
 * Verifica si un agente es válido
 * @param {string} agent - Nombre del agente
 * @returns {boolean}
 */
export function isValidAgent(agent) {
  return VALID_AGENTS.includes(agent);
}

/**
 * Log de transición para debugging
 * @param {string} fromAgent - Agente origen
 * @param {string} toAgent - Agente destino
 * @param {boolean} isValid - Si la transición fue validada
 * @param {string} reason - Razón de la transición
 */
export function logTransition(fromAgent, toAgent, isValid, reason = '') {
  const status = isValid ? '✅' : '❌';
  const reasonText = reason ? ` (${reason})` : '';
  console.log(`[TRANSITIONS] ${status} ${fromAgent} → ${toAgent}${reasonText}`);
}

export default {
  VALID_TRANSITIONS,
  VALID_AGENTS,
  validateTransition,
  getAvailableAgents,
  isValidAgent,
  logTransition
};
