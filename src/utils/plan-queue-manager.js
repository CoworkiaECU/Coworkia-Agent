/**
 * Plan Queue Manager
 * Gestiona la cola de planes de vuelo para continuidad entre sesiones
 */

import fs from 'fs/promises';
import path from 'path';

const QUEUE_FILE = 'planes-de-vuelo/queue.json';

/**
 * Carga la cola de planes desde el archivo JSON
 */
export async function loadQueue() {
  try {
    const data = await fs.readFile(QUEUE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('[QUEUE] No se pudo cargar queue.json, creando uno nuevo');
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      currentPlan: null,
      queue: [],
      metrics: {
        avgTaskTime: '12min',
        avgPlanTime: '2.5h',
        successRate: 0.85,
        blockerRate: 0.15,
        totalPlansCompleted: 0,
        mostCommonBlockers: []
      }
    };
  }
}

/**
 * Guarda la cola de planes en el archivo JSON
 */
export async function saveQueue(queue) {
  queue.lastUpdated = new Date().toISOString();
  await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  console.log('[QUEUE] Queue actualizada');
}

/**
 * Añade un nuevo plan a la cola
 */
export async function addToQueue(plan) {
  const queue = await loadQueue();
  
  const newPlan = {
    id: plan.id || generatePlanId(plan.title),
    title: plan.title,
    status: 'pending',
    plan: null,
    estimatedTime: plan.estimatedTime || '2-3h',
    dependencies: plan.dependencies || [],
    priority: plan.priority || 'medium',
    notes: plan.notes || '',
    blockers: []
  };
  
  queue.queue.push(newPlan);
  await saveQueue(queue);
  
  console.log(`[QUEUE] Plan añadido: ${newPlan.id}`);
  return newPlan;
}

/**
 * Actualiza el estado de un plan
 */
export async function updatePlanStatus(planId, status, data = {}) {
  const queue = await loadQueue();
  const plan = queue.queue.find(p => p.id === planId);
  
  if (!plan) {
    throw new Error(`Plan ${planId} not found in queue`);
  }
  
  plan.status = status;
  
  if (status === 'in-progress') {
    plan.startedAt = data.startedAt || new Date().toISOString();
    queue.currentPlan = plan.plan;
  }
  
  if (status === 'completed') {
    plan.completedAt = data.completedAt || new Date().toISOString();
    plan.duration = calculateDuration(plan.startedAt, plan.completedAt);
    plan.commits = data.commits || [];
    
    // Actualizar métricas
    queue.metrics.totalPlansCompleted++;
  }
  
  if (status === 'blocked') {
    plan.blockers = data.blockers || [];
  }
  
  await saveQueue(queue);
  console.log(`[QUEUE] Plan ${planId} → ${status}`);
  
  return plan;
}

/**
 * Obtiene el siguiente plan disponible en la cola
 */
export async function getNextPlan() {
  const queue = await loadQueue();
  
  // Buscar primer plan pending sin dependencies bloqueadoras
  const pendingPlans = queue.queue
    .filter(p => p.status === 'pending')
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  
  for (const plan of pendingPlans) {
    const hasBlockedDeps = plan.dependencies.some(depId => {
      const dep = queue.queue.find(p => p.id === depId);
      return dep && dep.status !== 'completed';
    });
    
    if (!hasBlockedDeps) {
      console.log(`[QUEUE] Siguiente plan disponible: ${plan.id}`);
      return plan;
    }
  }
  
  console.log('[QUEUE] No hay planes disponibles (todos tienen dependencies bloqueadas)');
  return null;
}

/**
 * Obtiene el plan actualmente en progreso
 */
export async function getCurrentPlan() {
  const queue = await loadQueue();
  return queue.queue.find(p => p.status === 'in-progress');
}

/**
 * Genera un status report de la cola
 */
export async function getQueueStatus() {
  const queue = await loadQueue();
  
  const inProgress = queue.queue.filter(p => p.status === 'in-progress');
  const pending = queue.queue.filter(p => p.status === 'pending');
  const completed = queue.queue.filter(p => p.status === 'completed');
  const blocked = queue.queue.filter(p => p.status === 'blocked');
  
  return {
    inProgress,
    pending,
    completed,
    blocked,
    total: queue.queue.length,
    metrics: queue.metrics
  };
}

/**
 * Genera un ID único para un plan basado en su título
 */
function generatePlanId(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Calcula la duración entre dos timestamps
 */
function calculateDuration(start, end) {
  const diff = new Date(end) - new Date(start);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours === 0) {
    return `${minutes}min`;
  }
  
  return `${hours}h ${minutes}min`;
}

/**
 * Añade un blocker a un plan
 */
export async function addBlocker(planId, blocker) {
  const queue = await loadQueue();
  const plan = queue.queue.find(p => p.id === planId);
  
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }
  
  if (!plan.blockers) {
    plan.blockers = [];
  }
  
  plan.blockers.push({
    type: blocker.type,
    description: blocker.description,
    addedAt: new Date().toISOString()
  });
  
  plan.status = 'blocked';
  
  await saveQueue(queue);
  console.log(`[QUEUE] Blocker añadido a ${planId}: ${blocker.type}`);
}

/**
 * Remueve blockers de un plan
 */
export async function removeBlockers(planId) {
  const queue = await loadQueue();
  const plan = queue.queue.find(p => p.id === planId);
  
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }
  
  plan.blockers = [];
  
  if (plan.status === 'blocked') {
    plan.status = 'pending';
  }
  
  await saveQueue(queue);
  console.log(`[QUEUE] Blockers removidos de ${planId}`);
}
