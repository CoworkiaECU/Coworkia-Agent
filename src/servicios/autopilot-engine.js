/**
 * 🤖 Autopilot Engine - Motor de Ejecución Autónoma
 * Lee planes de vuelo y los ejecuta automáticamente
 * Integrado con sistema de notificaciones WhatsApp
 * 
 * ACTIVACIÓN: "autopilot verde nena" desde chat
 * 
 * CARACTERÍSTICAS:
 * - Lee plan-vuelo-*.md desde planes-de-vuelo/
 * - Ejecuta tareas secuencialmente
 * - Notifica a Diego en momentos clave
 * - Detecta bloqueos (3 intentos)
 * - Checkpoints opcionales cada 3-4 tareas
 * - Pausa en decisiones arquitecturales
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { notifyDiego } from '../express-servidor/endpoints-api/internal-notifications.js';
import { setPendingQuestion, getAutopilotState, setAutopilotState } from './autopilot-state.js';
import { loadQueue, updatePlanStatus, getNextPlan } from '../utils/plan-queue-manager.js';
import { loggers } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = loggers.autopilot || console;

// Estado de ejecución
let executionState = {
  running: false,
  currentPlan: null,
  currentTask: null,
  taskIndex: 0,
  tasksCompleted: 0,
  tasksTotal: 0,
  errors: [],
  startedAt: null,
  checkpointsSent: 0
};

/**
 * 🚀 Inicia autopilot con un plan
 * @param {string} planFile - Nombre del archivo plan (ej: 'plan-vuelo-20mar.md')
 */
export async function startAutopilot(planFile) {
  if (executionState.running) {
    logger.warn('[AUTOPILOT] ⚠️ Ya hay un autopilot en ejecución');
    return { success: false, reason: 'already_running' };
  }
  
  try {
    logger.info(`[AUTOPILOT] 🚀 Iniciando autopilot con plan: ${planFile}`);
    
    // Cargar plan
    const planPath = path.join(__dirname, '../../planes-de-vuelo', planFile);
    const planContent = await fs.readFile(planPath, 'utf-8');
    
    // Parsear tareas del plan
    const tasks = parsePlanTasks(planContent);
    
    if (tasks.length === 0) {
      logger.error('[AUTOPILOT] ❌ No se encontraron tareas en el plan');
      return { success: false, reason: 'no_tasks' };
    }
    
    // Inicializar estado
    executionState = {
      running: true,
      currentPlan: planFile,
      currentTask: null,
      taskIndex: 0,
      tasksCompleted: 0,
      tasksTotal: tasks.length,
      errors: [],
      startedAt: new Date(),
      checkpointsSent: 0,
      tasks
    };
    
    // Actualizar estado global de autopilot
    setAutopilotState({
      active: true,
      currentPlan: planFile,
      currentTask: 0
    });
    
    // Notificar inicio
    await notifyDiego('checkpoint', 'Autopilot iniciado', {
      plan: planFile,
      tasks: tasks.length,
      mode: 'autonomous'
    });
    
    // Comenzar ejecución
    executeNextTask();
    
    return { success: true, plan: planFile, tasks: tasks.length };
    
  } catch (error) {
    logger.error('[AUTOPILOT] ❌ Error iniciando:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📋 Parsea tareas desde un plan de vuelo markdown
 */
function parsePlanTasks(planContent) {
  const tasks = [];
  const lines = planContent.split('\n');
  
  let inTaskSection = false;
  let currentSection = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detectar secciones de tareas
    if (line.startsWith('##') || line.startsWith('###')) {
      currentSection = line.replace(/^#+\s*/, '');
      inTaskSection = true;
    }
    
    // Detectar checkbox de tarea
    if (line.match(/^[-*]\s*\[[ x]\]/)) {
      const checked = line.includes('[x]') || line.includes('[X]');
      const taskText = line.replace(/^[-*]\s*\[[ xX]\]\s*/, '');
      
      // Solo tareas no completadas
      if (!checked && taskText.length > 0) {
        tasks.push({
          id: tasks.length + 1,
          section: currentSection,
          description: taskText,
          lineNumber: i + 1,
          attempts: 0,
          status: 'pending'
        });
      }
    }
  }
  
  return tasks;
}

/**
 * ⚡ Ejecuta la siguiente tarea
 */
async function executeNextTask() {
  if (!executionState.running) {
    logger.info('[AUTOPILOT] ⏸️ Ejecución pausada');
    return;
  }
  
  const { tasks, taskIndex, tasksTotal } = executionState;
  
  // Verificar si terminamos
  if (taskIndex >= tasksTotal) {
    await onPlanCompleted();
    return;
  }
  
  const task = tasks[taskIndex];
  executionState.currentTask = task;
  
  logger.info(`[AUTOPILOT] 📍 Tarea ${taskIndex + 1}/${tasksTotal}: ${task.description}`);
  
  try {
    // Ejecutar tarea (placeholder - aquí iría la lógica real de ejecución)
    const result = await executeTask(task);
    
    if (result.success) {
      // Tarea exitosa
      task.status = 'completed';
      executionState.tasksCompleted++;
      executionState.taskIndex++;
      
      logger.info(`[AUTOPILOT] ✅ Tarea completada (${executionState.tasksCompleted}/${tasksTotal})`);
      
      // Checkpoint cada 3-4 tareas (si está habilitado)
      const shouldSendCheckpoint = process.env.NOTIFICATIONS_CHECKPOINT === 'true';
      if (shouldSendCheckpoint && executionState.tasksCompleted % 3 === 0) {
        await sendCheckpoint();
      }
      
      // Continuar con siguiente tarea
      setTimeout(() => executeNextTask(), 1000);
      
    } else if (result.needsDecision) {
      // Necesita decisión de Diego
      await requestDecision(task, result);
      
    } else {
      // Error en la tarea
      await onTaskError(task, result.error);
    }
    
  } catch (error) {
    await onTaskError(task, error);
  }
}

/**
 * 🎯 Ejecuta una tarea específica
 * PLACEHOLDER: Aquí iría la lógica real de ejecución
 */
async function executeTask(task) {
  // Por ahora, simulamos ejecución
  logger.info(`[AUTOPILOT] 🔧 Ejecutando: ${task.description}`);
  
  // Simulación: 70% éxito, 20% necesita decisión, 10% error
  const rand = Math.random();
  
  if (rand < 0.7) {
    // Éxito
    return { success: true };
  } else if (rand < 0.9) {
    // Necesita decisión arquitectural
    return {
      success: false,
      needsDecision: true,
      reason: 'architectural_change',
      description: 'Esta tarea requiere un cambio arquitectural que necesita aprobación'
    };
  } else {
    // Error
    throw new Error('Error simulado en tarea');
  }
}

/**
 * ❓ Solicita decisión a Diego
 */
async function requestDecision(task, result) {
  logger.info('[AUTOPILOT] ❓ Solicitando decisión a Diego');
  
  // Pausar ejecución
  executionState.running = false;
  
  // Guardar pregunta pendiente
  await setPendingQuestion('architectural_change', result.description, {
    task: task.description,
    taskIndex: executionState.taskIndex,
    plan: executionState.currentPlan,
    reason: result.reason
  });
  
  // Notificar a Diego
  await notifyDiego('question', 'Decisión requerida en autopilot', {
    task: task.description,
    reason: result.description,
    progress: `${executionState.tasksCompleted}/${executionState.tasksTotal}`,
    plan: executionState.currentPlan
  });
}

/**
 * ❌ Maneja error en tarea
 */
async function onTaskError(task, error) {
  task.attempts++;
  executionState.errors.push({
    task: task.description,
    error: error.message,
    attempt: task.attempts,
    timestamp: new Date()
  });
  
  logger.error(`[AUTOPILOT] ❌ Error en tarea (intento ${task.attempts}/3):`, error.message);
  
  if (task.attempts >= 3) {
    // Máximo de intentos alcanzado - notificar error crítico
    logger.error('[AUTOPILOT] 🚨 Tarea bloqueada después de 3 intentos');
    
    executionState.running = false;
    
    await notifyDiego('error', 'Tarea bloqueada en autopilot', {
      task: task.description,
      error: error.message,
      attempts: task.attempts,
      progress: `${executionState.tasksCompleted}/${executionState.tasksTotal}`,
      plan: executionState.currentPlan
    });
    
  } else {
    // Reintentar después de 5 segundos
    logger.info(`[AUTOPILOT] 🔄 Reintentando en 5 segundos...`);
    setTimeout(() => executeNextTask(), 5000);
  }
}

/**
 * 📊 Envía checkpoint de progreso
 */
async function sendCheckpoint() {
  executionState.checkpointsSent++;
  
  const elapsed = Math.floor((Date.now() - executionState.startedAt.getTime()) / 1000 / 60);
  
  await notifyDiego('checkpoint', 'Checkpoint de progreso', {
    plan: executionState.currentPlan,
    completed: executionState.tasksCompleted,
    total: executionState.tasksTotal,
    percentage: Math.floor((executionState.tasksCompleted / executionState.tasksTotal) * 100),
    elapsed: `${elapsed} min`,
    errors: executionState.errors.length
  });
  
  logger.info(`[AUTOPILOT] 📊 Checkpoint ${executionState.checkpointsSent} enviado`);
}

/**
 * ✅ Plan completado
 */
async function onPlanCompleted() {
  logger.info('[AUTOPILOT] ✅ Plan completado');
  
  const elapsed = Math.floor((Date.now() - executionState.startedAt.getTime()) / 1000 / 60);
  
  executionState.running = false;
  
  // Actualizar estado global
  setAutopilotState({
    active: false,
    currentPlan: null,
    currentTask: null
  });
  
  // Actualizar queue
  await updatePlanStatus(executionState.currentPlan, 'completed');
  
  // Verificar si hay siguiente plan en queue
  const queue = await loadQueue();
  const nextPlan = getNextPlan(queue);
  
  // Notificar éxito
  await notifyDiego('success', 'Plan completado exitosamente', {
    plan: executionState.currentPlan,
    tasks: executionState.tasksCompleted,
    elapsed: `${elapsed} min`,
    errors: executionState.errors.length,
    nextPlan: nextPlan ? nextPlan.file : null
  });
}

/**
 * ⏸️ Pausa autopilot
 */
export function pauseAutopilot(reason = 'manual') {
  if (!executionState.running) {
    return { success: false, reason: 'not_running' };
  }
  
  logger.info(`[AUTOPILOT] ⏸️ Pausando autopilot: ${reason}`);
  executionState.running = false;
  
  return { success: true, state: executionState };
}

/**
 * ▶️ Resume autopilot
 */
export function resumeAutopilot() {
  if (executionState.running) {
    return { success: false, reason: 'already_running' };
  }
  
  if (!executionState.currentPlan) {
    return { success: false, reason: 'no_plan_loaded' };
  }
  
  logger.info('[AUTOPILOT] ▶️ Resumiendo autopilot');
  executionState.running = true;
  
  executeNextTask();
  
  return { success: true };
}

/**
 * 📊 Obtiene estado actual
 */
export function getExecutionState() {
  return { ...executionState };
}

/**
 * 🧪 Modo demo para testing
 */
export async function runAutopilotDemo() {
  logger.info('[AUTOPILOT] 🎭 Modo DEMO activado');
  
  // Simular plan simple
  const demoTasks = [
    { id: 1, description: 'Tarea de prueba 1', status: 'pending', attempts: 0 },
    { id: 2, description: 'Tarea de prueba 2', status: 'pending', attempts: 0 },
    { id: 3, description: 'Tarea de prueba 3', status: 'pending', attempts: 0 }
  ];
  
  executionState = {
    running: true,
    currentPlan: 'demo-plan',
    currentTask: null,
    taskIndex: 0,
    tasksCompleted: 0,
    tasksTotal: demoTasks.length,
    errors: [],
    startedAt: new Date(),
    checkpointsSent: 0,
    tasks: demoTasks
  };
  
  await notifyDiego('checkpoint', 'Demo autopilot iniciado', {
    plan: 'demo-plan',
    tasks: demoTasks.length,
    mode: 'demo'
  });
  
  // Ejecutar demo
  for (let i = 0; i < demoTasks.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    executionState.tasksCompleted++;
    logger.info(`[AUTOPILOT-DEMO] ✅ Tarea ${i + 1} completada`);
  }
  
  await notifyDiego('success', 'Demo completado', {
    plan: 'demo-plan',
    tasks: demoTasks.length,
    elapsed: '10 seg'
  });
  
  executionState.running = false;
}
