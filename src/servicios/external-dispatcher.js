/**
 * 🚦 Dispatcher resiliente para integraciones externas
 * Ofrece timeout, reintentos exponenciales y un circuito simple por integración.
 */

const circuits = new Map();

const DEFAULTS = {
  timeoutMs: 5000,
  maxRetries: 2,
  backoffBaseMs: 400,
  circuitBreaker: {
    failureThreshold: 5,
    cooldownMs: 30_000
  }
};

function getCircuit(id, overrides = {}) {
  if (!id) return null;
  if (!circuits.has(id)) {
    circuits.set(id, {
      failures: 0,
      openedAt: null,
      options: { ...DEFAULTS.circuitBreaker, ...overrides }
    });
  }
  return circuits.get(id);
}

function isCircuitOpen(circuit) {
  if (!circuit || circuit.failures < circuit.options.failureThreshold) {
    return false;
  }

  if (!circuit.openedAt) {
    circuit.openedAt = Date.now();
    return true;
  }

  const elapsed = Date.now() - circuit.openedAt;
  if (elapsed >= circuit.options.cooldownMs) {
    circuit.failures = 0;
    circuit.openedAt = null;
    return false;
  }

  return true;
}

function recordSuccess(circuit) {
  if (!circuit) return;
  circuit.failures = 0;
  circuit.openedAt = null;
}

function recordFailure(circuit) {
  if (!circuit) return;
  circuit.failures += 1;
  if (circuit.failures >= circuit.options.failureThreshold && !circuit.openedAt) {
    circuit.openedAt = Date.now();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker abierto') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Lanza solicitudes HTTP con timeout, reintentos y circuito.
 */
export async function dispatchHttpRequest(config) {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULTS.timeoutMs,
    maxRetries = DEFAULTS.maxRetries,
    backoffBaseMs = DEFAULTS.backoffBaseMs,
    circuitId = 'http',
    circuitOptions = {}
  } = config;

  if (!url) throw new Error('dispatchHttpRequest requiere url');

  const circuit = getCircuit(circuitId, circuitOptions);
  if (isCircuitOpen(circuit)) {
    throw new CircuitOpenError(`Circuito ${circuitId} abierto`);
  }

  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok && response.status >= 500 && attempt < maxRetries) {
        throw new Error(`HTTP ${response.status}`);
      }

      recordSuccess(circuit);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      recordFailure(circuit);

      if (attempt >= maxRetries || error.name === 'AbortError') {
        break;
      }

      const backoff = backoffBaseMs * Math.pow(2, attempt);
      await sleep(backoff);
      attempt += 1;
    }
  }

  throw lastError;
}

/**
 * Ejecuta funciones arbitrarias (ej. SDKs) con reintentos y circuito.
 */
export async function runWithRetry(taskName, fn, options = {}) {
  const {
    maxRetries = DEFAULTS.maxRetries,
    backoffBaseMs = DEFAULTS.backoffBaseMs,
    circuitId = taskName,
    circuitOptions = {}
  } = options;

  const circuit = getCircuit(circuitId, circuitOptions);
  if (isCircuitOpen(circuit)) {
    throw new CircuitOpenError(`Circuito ${circuitId} abierto`);
  }

  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      const result = await fn();
      recordSuccess(circuit);
      return result;
    } catch (error) {
      lastError = error;
      recordFailure(circuit);

      if (attempt >= maxRetries) break;

      const backoff = backoffBaseMs * Math.pow(2, attempt);
      await sleep(backoff);
      attempt += 1;
    }
  }

  throw lastError;
}

export function getCircuitState(id) {
  const circuit = circuits.get(id);
  if (!circuit) return null;
  return {
    failures: circuit.failures,
    openedAt: circuit.openedAt,
    isOpen: isCircuitOpen(circuit),
    options: circuit.options
  };
}

export function getAllCircuits() {
  const result = {};
  for (const [id, circuit] of circuits.entries()) {
    result[id] = {
      failures: circuit.failures,
      openedAt: circuit.openedAt,
      isOpen: isCircuitOpen(circuit),
      options: circuit.options
    };
  }
  return result;
}
