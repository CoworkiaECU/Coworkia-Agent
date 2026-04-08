/**
 * ✨ magic-persona.js — Personalidad centralizada de Magic
 *
 * Magic es el asistente técnico invisible de Diego (Sensei).
 * Tono: inspirador, creativo, cercano. Nunca robótico.
 * SIEMPRE incentiva mirar el dashboard de Magic Todos.
 *
 * Flujo autónomo:
 *   Diego escribe en dashboard → Magic recibe → crea plan de vuelo →
 *   presenta a Diego por WA → Diego aprueba → Magic ejecuta →
 *   Diego autoriza deploy
 */

// ─── Openers creativos ────────────────────────────────────────────────────────
const OPENERS = [
  'Sensei 🥋, soy Magic✨',
  'Sensei 🥋, aquí Magic✨',
  'Sensei 🥋, Magic✨ reportándose',
  'Sensei 🥋, Magic✨ al habla',
  'Sensei 🥋, tu Magic✨ present',
  'Sensei 🥋, Magic✨ en acción',
  'Sensei 🥋, soy tu Magic✨',
  'Sensei 🥋, Magic✨ lista',
];

const VERBS = {
  inform:  ['te informo', 'te cuento', 'te reporto', 'te comparto', 'mira esto'],
  success: ['lo logré', 'misión cumplida', 'todo listo', 'hecho', 'completado con éxito'],
  error:   ['necesito tu ojo', 'algo se cruzó', 'hay un tema', 'encontré un obstáculo'],
  question:['necesito tu decisión', 'te consulto algo', 'una pregunta rápida', 'tu llamada, Sensei'],
  checkpoint: ['avance parcial', 'vamos bien', 'progreso firme', 'seguimos en ruta'],
  newTodo: ['vi tu nueva misión', 'recibí tu encargo', 'capturado al vuelo', 'nueva tarea en radar'],
  deploy:  ['listo para despegar', 'preparado para producción', 'código listo, falta tu OK'],
};

const DASHBOARD_CTAS = [
  '📊 Mira el avance en tu dashboard → /todos-dashboard.html',
  '📊 Tu dashboard está actualizado → /todos-dashboard.html',
  '✨ Revisa el progreso en Magic Todos → /todos-dashboard.html',
  '📋 Dashboard actualizado, échale un ojo → /todos-dashboard.html',
  '🎯 Tu panel de control te espera → /todos-dashboard.html',
  '📊 Los avances están en tu dash → /todos-dashboard.html',
];

const CLOSINGS = [
  '💪 Seguimos construyendo.',
  '🚀 A por más.',
  '🔥 Con todo, Sensei.',
  '✨ La magia no para.',
  '🎯 Precisión quirúrgica, como te gusta.',
  '💜 Tu equipo digital no descansa.',
  '⚡ Velocidad y calidad, sin negociar.',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Header de Magic — siempre varía para no ser repetitivo
 * @param {string} type - 'inform'|'success'|'error'|'question'|'checkpoint'|'newTodo'|'deploy'
 * @returns {string} e.g. "Sensei 🥋, soy Magic✨ — te informo:"
 */
export function magicHeader(type = 'inform') {
  const opener = pick(OPENERS);
  const verb = pick(VERBS[type] || VERBS.inform);
  return `*${opener}* — ${verb}:`;
}

/**
 * CTA al dashboard — varía cada vez
 * @returns {string}
 */
export function dashboardCTA() {
  return pick(DASHBOARD_CTAS);
}

/**
 * Cierre inspirador
 * @returns {string}
 */
export function magicClosing() {
  return pick(CLOSINGS);
}

/**
 * Mensaje completo con header + body + dashboard CTA + closing
 * @param {string} type - tipo de notificación
 * @param {string} body - contenido del mensaje
 * @param {object} options
 * @param {boolean} options.includeDashboard - incluir CTA al dashboard (default: true)
 * @param {boolean} options.includeClosing - incluir cierre inspirador (default: true)
 * @returns {string}
 */
export function magicMessage(type, body, { includeDashboard = true, includeClosing = true } = {}) {
  const parts = [
    magicHeader(type),
    '',
    body,
  ];

  if (includeDashboard) {
    parts.push('');
    parts.push(dashboardCTA());
  }

  if (includeClosing) {
    parts.push('');
    parts.push(magicClosing());
  }

  return parts.join('\n');
}

/**
 * Formatea un nuevo TODO recibido del dashboard para enviar por WA
 * @param {{ id: number, title: string, priority: string, assigned_agent?: string }} todo
 * @returns {string}
 */
export function formatNewTodoNotification(todo) {
  const priorityEmoji = {
    urgent: '🔴 URGENTE',
    high: '🟠 Alta',
    medium: '🟡 Media',
    low: '🟢 Baja',
  };

  const body = [
    `📋 *Nueva tarea #${todo.id}*`,
    ``,
    `📝 ${todo.title}`,
    `⚡ Prioridad: ${priorityEmoji[todo.priority] || todo.priority}`,
    todo.assigned_agent ? `🤖 Agente: ${todo.assigned_agent}` : null,
    ``,
    `Voy a armar el plan de ejecución y te lo presento.`,
    `Espera mi propuesta para que la apruebes 👍`,
  ].filter(Boolean).join('\n');

  return magicMessage('newTodo', body);
}

/**
 * Formatea propuesta de plan de vuelo para aprobación
 * @param {{ todoId: number, title: string, steps: string[], estimate?: string }} plan
 * @returns {string}
 */
export function formatFlightPlanProposal(plan) {
  const stepsText = plan.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const body = [
    `🗺️ *Plan de vuelo para tarea #${plan.todoId}*`,
    `📝 ${plan.title}`,
    ``,
    `📋 *Pasos:*`,
    stepsText,
    plan.estimate ? `\n⏱️ Tiempo estimado: ${plan.estimate}` : '',
    ``,
    `¿Apruebas este plan?`,
    `Responde: *SI* / *NO* / *AJUSTAR*`,
  ].filter(Boolean).join('\n');

  return magicMessage('question', body, { includeClosing: false });
}

/**
 * Formatea reporte de deploy listo para autorización
 * @param {{ version?: string, commits?: string[], tasksCompleted?: number, blockName?: string }} data
 * @returns {string}
 */
export function formatDeployReady(data) {
  const body = [
    `🚀 *Código listo para producción*`,
    data.blockName ? `📋 Bloque: ${data.blockName}` : null,
    data.tasksCompleted ? `✅ ${data.tasksCompleted} tareas completadas` : null,
    data.commits?.length ? `📝 ${data.commits.length} commit(s)` : null,
    ``,
    `Todo probado y committeado.`,
    ``,
    `¿Autorizo el deploy?`,
    `Responde: *SI* / *NO* / *REVIEW*`,
  ].filter(Boolean).join('\n');

  return magicMessage('deploy', body, { includeClosing: false });
}
