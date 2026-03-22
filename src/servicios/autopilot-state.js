/**
 * 🎯 Autopilot State Manager
 * Gestiona el estado del autopilot y preguntas pendientes
 * 
 * PROPÓSITO:
 * Distinguir entre:
 * - Comandos del sistema (Si/No cuando hay pregunta pendiente)
 * - Mensajes normales de prueba de agentes
 * 
 * INTEGRADO CON:
 * - autopilot-question-db.js para persistencia en PostgreSQL
 */

import { savePendingQuestion as dbSavePending, getPendingQuestion as dbGetPending, markQuestionAnswered } from './autopilot-question-db.js';

// Estado en memoria (en producción podría ser Redis o DB)
let autopilotState = {
  active: false,
  currentPlan: null,
  currentTask: null,
  waitingForApproval: false,
  pendingQuestion: null,  // {type, question, askedAt, data}
  lastNotification: null
};

const APPROVAL_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas — Diego responde cuando puede

/**
 * 🔍 Verifica si un mensaje es un comando del sistema
 * @param {string} userId - Número de teléfono
 * @param {string} message - Mensaje recibido
 * @returns {Object|null} - {command, action} o null si no es comando
 */
export function detectSystemCommand(userId, message) {
  // Solo interpretar como comando si:
  // 1. Es el número personal de Diego
  // 2. Hay una pregunta pendiente
  // 3. Está dentro del timeout
  
  const DIEGO_PERSONAL = process.env.DIEGO_PERSONAL_PHONE;
  
  if (userId !== DIEGO_PERSONAL) {
    return null; // No es Diego, no puede ser comando
  }
  
  if (!autopilotState.waitingForApproval || !autopilotState.pendingQuestion) {
    return null; // No hay pregunta pendiente, mensaje normal
  }
  
  // Verificar timeout
  const elapsed = Date.now() - new Date(autopilotState.pendingQuestion.askedAt).getTime();
  if (elapsed > APPROVAL_TIMEOUT) {
    console.log('[AUTOPILOT] ⏰ Pregunta expiró (>5min), interpretando como mensaje normal');
    clearPendingQuestion(); // Limpiar pregunta expirada
    return null;
  }
  
  // Si llegamos aquí: hay pregunta pendiente y está dentro de timeout
  // Interpretar el mensaje como comando
  const msg = message.toLowerCase().trim();
  
  // Comandos de aprobación
  if (msg === 'si' || msg === '✓' || msg === 'ok' || msg === 'dale' || msg === 'yes') {
    return { 
      command: 'APPROVE', 
      action: 'continue',
      question: autopilotState.pendingQuestion
    };
  }
  
  // Comandos de rechazo
  if (msg === 'no' || msg === 'x' || msg === 'stop' || msg === 'espera') {
    return { 
      command: 'REJECT', 
      action: 'pause',
      question: autopilotState.pendingQuestion
    };
  }
  
  // Comando de review
  if (msg === 'review' || msg === 'revisión' || msg === 'diff') {
    return { 
      command: 'REVIEW', 
      action: 'send_details',
      question: autopilotState.pendingQuestion
    };
  }
  
  // Comando de deploy
  if (msg === 'deploy' || msg === 'despliega') {
    return { 
      command: 'DEPLOY', 
      action: 'deploy_to_heroku',
      question: autopilotState.pendingQuestion
    };
  }
  
  // Comando de más info
  if (msg.includes('más info') || msg.includes('mas info') || msg.includes('detalles') || msg.includes('explica')) {
    return { 
      command: 'MORE_INFO', 
      action: 'send_details',
      question: autopilotState.pendingQuestion
    };
  }
  
  // Si no matchea ningún comando pero hay pregunta pendiente,
  // asumir que es mensaje normal (tal vez está probando otra cosa)
  console.log('[AUTOPILOT] 💬 Mensaje no matchea comandos esperados, interpretando como normal');
  return null;
}

/**
 * 📝 Registra una pregunta pendiente
 * Guarda en memoria Y en PostgreSQL para persistencia
 */
export async function setPendingQuestion(type, question, data = {}) {
  const DIEGO_PERSONAL = process.env.DIEGO_PERSONAL_PHONE;
  
  autopilotState.waitingForApproval = true;
  autopilotState.pendingQuestion = {
    type,      // 'deploy', 'architectural_change', 'decision', etc
    question,  // Texto de la pregunta
    askedAt: new Date().toISOString(),
    data       // Datos adicionales del contexto
  };
  
  console.log(`[AUTOPILOT] ❓ Pregunta pendiente: ${type}`);
  
  // Guardar en DB para persistencia
  if (DIEGO_PERSONAL) {
    try {
      const questionId = await dbSavePending(DIEGO_PERSONAL, type, question, data);
      autopilotState.pendingQuestion.id = questionId;
    } catch (error) {
      console.error('[AUTOPILOT] ⚠️ Error guardando en DB (estado solo en memoria):', error.message);
    }
  }
}

/**
 * 🧹 Limpia pregunta pendiente
 * Marca como respondida en DB si tiene ID
 */
export async function clearPendingQuestion(answer = null, result = {}) {
  const questionId = autopilotState.pendingQuestion?.id;
  
  autopilotState.waitingForApproval = false;
  autopilotState.pendingQuestion = null;
  
  console.log('[AUTOPILOT] ✓ Pregunta respondida/expirada');
  
  // Marcar como respondida en DB
  if (questionId) {
    try {
      await markQuestionAnswered(questionId, answer, result);
    } catch (error) {
      console.error('[AUTOPILOT] ⚠️ Error actualizando DB:', error.message);
    }
  }
}

/**
 * 📊 Obtiene el estado actual
 */
export function getAutopilotState() {
  return { ...autopilotState };
}

/**
 * 🔄 Actualiza el estado
 */
export function setAutopilotState(updates) {
  autopilotState = { ...autopilotState, ...updates };
}

/**
 * ❓ Verifica si está esperando aprobación
 */
export function isWaitingForApproval() {
  if (!autopilotState.waitingForApproval) {
    return false;
  }
  
  // Verificar si expiró
  if (autopilotState.pendingQuestion) {
    const elapsed = Date.now() - new Date(autopilotState.pendingQuestion.askedAt).getTime();
    if (elapsed > APPROVAL_TIMEOUT) {
      clearPendingQuestion();
      return false;
    }
  }
  
  return true;
}

/**
 * 🧪 Test del sistema de comandos
 */
export function testCommandDetection() {
  const DIEGO = '+593987770788';
  
  console.log('\n🧪 Test: Sin pregunta pendiente');
  console.log('Resultado:', detectSystemCommand(DIEGO, 'si')); // null - no hay pregunta
  
  console.log('\n🧪 Test: Con pregunta pendiente');
  setPendingQuestion('deploy', '¿Deploy a Heroku?', { plan: 'test' });
  console.log('Resultado Si:', detectSystemCommand(DIEGO, 'si')); // APPROVE
  console.log('Resultado No:', detectSystemCommand(DIEGO, 'no')); // REJECT
  console.log('Resultado Review:', detectSystemCommand(DIEGO, 'review')); // REVIEW
  
  clearPendingQuestion();
  
  console.log('\n🧪 Test: Después de limpiar');
  console.log('Resultado:', detectSystemCommand(DIEGO, 'si')); // null - pregunta limpiada
  
  console.log('\n🧪 Test: Mensaje normal de prueba');
  console.log('Resultado:', detectSystemCommand(DIEGO, 'Hola Aurora')); // null
  
  console.log('\n✅ Tests completados\n');
}
