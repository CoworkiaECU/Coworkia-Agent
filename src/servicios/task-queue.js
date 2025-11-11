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
    runWithRetry(`${this.name}:${task.label}`, task.fn, {
      maxRetries: task.maxRetries ?? 2,
      backoffBaseMs: task.backoffBaseMs ?? 500,
      circuitId: task.circuitId ?? `${this.name}:${task.label}`
    })
      .then(task.resolve)
      .catch(task.reject)
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
      concurrency: queue.concurrency
    };
  });
  return stats;
}
