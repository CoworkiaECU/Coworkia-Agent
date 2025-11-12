/**
 * 🧵 Cola ligera en memoria para ejecutar tareas lentas sin bloquear el webhook.
 */

import { runWithRetry } from './external-dispatcher.js';

class TaskQueue {
  constructor({ concurrency = 2, name }) {
    this.concurrency = concurrency;
    this.name = name;
    this.queue = [];
    this.running = 0;
  }

  enqueue(task) {
    this.queue.push(task);
    this.process();
    return task.promise;
  }

  process() {
    if (this.running >= this.concurrency) return;
    const task = this.queue.shift();
    if (!task) return;

    this.running += 1;
    console.log(`[TaskQueue] 🚀 Procesando: ${this.name}:${task.label} (${this.queue.length} pendientes)`);
    
    runWithRetry(`${this.name}:${task.label}`, task.fn, {
      maxRetries: task.maxRetries ?? 2,
      backoffBaseMs: task.backoffBaseMs ?? 500,
      circuitId: task.circuitId ?? `${this.name}:${task.label}`
    })
      .then(result => {
        console.log(`[TaskQueue] ✅ Completado: ${this.name}:${task.label}`);
        task.resolve(result);
      })
      .catch(error => {
        console.error(`[TaskQueue] ❌ Error en ${this.name}:${task.label}:`, error.message);
        task.reject(error);
      })
      .finally(() => {
        this.running -= 1;
        this.process();
      });
  }
}

const queues = new Map();

function getQueue(name, options = {}) {
  if (!queues.has(name)) {
    queues.set(name, new TaskQueue({ concurrency: options.concurrency || 2, name }));
  }
  return queues.get(name);
}

/**
 * Encola una tarea para ejecutarse en background.
 */
export function enqueueBackgroundTask(queueName, label, fn, options = {}) {
  const queue = getQueue(queueName, options);
  let resolveFn;
  let rejectFn;

  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  queue.enqueue({
    fn,
    label,
    maxRetries: options.maxRetries,
    backoffBaseMs: options.backoffBaseMs,
    circuitId: options.circuitId,
    promise,
    resolve: resolveFn,
    reject: rejectFn
  });

  return promise;
}

export function getQueueStats() {
  const stats = {};
  queues.forEach((queue, name) => {
    stats[name] = {
      pending: queue.queue.length,
      running: queue.running,
      concurrency: queue.concurrency,
      healthy: queue.queue.length < 10 && queue.running <= queue.concurrency
    };
  });
  return stats;
}

/**
 * 🧪 Ejecuta una tarea de prueba en cada cola para verificar que están funcionando
 */
export async function testQueues() {
  console.log('[TaskQueue] 🧪 Probando todas las colas...');
  
  const testTasks = [
    { queue: 'emails', label: 'test-email', fn: async () => ({ test: true, queue: 'emails' }) },
    { queue: 'calendar-events', label: 'test-calendar', fn: async () => ({ test: true, queue: 'calendar-events' }) }
  ];
  
  const results = await Promise.allSettled(
    testTasks.map(task => 
      enqueueBackgroundTask(task.queue, task.label, task.fn)
    )
  );
  
  results.forEach((result, index) => {
    const task = testTasks[index];
    if (result.status === 'fulfilled') {
      console.log(`[TaskQueue] ✅ Cola ${task.queue} funciona correctamente`);
    } else {
      console.error(`[TaskQueue] ❌ Cola ${task.queue} falló:`, result.reason);
    }
  });
  
  return results;
}
