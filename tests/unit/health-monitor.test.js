/**
 * @file health-monitor.test.js
 * @description Tests unitarios para src/servicios/health-monitor.js
 *
 * Valida el comportamiento del parche anti-falso-positivo en checkOpenAI():
 *   A) AbortError (timeout >15s) NO llama notifyCriticalError
 *   B) Error HTTP real sigue incrementando failCounters y dispara alerta al llegar a FAIL_THRESHOLD=2
 *   C) Check exitoso devuelve true y no genera ninguna alerta
 *   D) Mecanismo real: setTimeout → controller.abort() → AbortError → no alerta (fake timers, 0ms reales)
 *
 * Sin tráfico externo — fetch es mockeado globalmente.
 * Sin esperas reales — fetch mock resuelve/rechaza de inmediato (A/B/C) o vía fake timers (D).
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// ─── Mocks (deben declararse ANTES del primer import del módulo bajo test) ────

jest.unstable_mockModule('../../src/servicios/notification-service.js', () => ({
  notifyCriticalError:    jest.fn().mockResolvedValue(undefined),
  notifyHighIntent:       jest.fn().mockResolvedValue(undefined),
  notifyDailyReport:      jest.fn().mockResolvedValue(undefined),
  notifyAutopilotComplete: jest.fn().mockResolvedValue(undefined),
  notifyAutopilotBlocked: jest.fn().mockResolvedValue(undefined),
  notifyAdrianaAccepted:  jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/database/database.js', () => ({
  query: jest.fn().mockResolvedValue([]),
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { _checkOpenAI, _resetCountersForTest } =
  await import('../../src/servicios/health-monitor.js');

const { notifyCriticalError } =
  await import('../../src/servicios/notification-service.js');

// ─── Preservar valores originales (capturados una vez al cargar la suite) ─────
const ORIGINAL_FETCH              = global.fetch;
const ORIGINAL_OPENAI_KEY_EXISTS  = 'OPENAI_API_KEY' in process.env;
const ORIGINAL_OPENAI_KEY_VALUE   = process.env.OPENAI_API_KEY;

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('health-monitor — checkOpenAI (parche anti-falso-positivo)', () => {

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test-fake-key';
    jest.clearAllMocks();
    _resetCountersForTest(); // failCounters = {0,0,0} antes de cada test
  });

  afterEach(() => {
    // Restaurar global.fetch exactamente como estaba antes de la suite
    global.fetch = ORIGINAL_FETCH;

    // Restaurar OPENAI_API_KEY: recuperar su valor original o eliminarlo si no existía
    if (ORIGINAL_OPENAI_KEY_EXISTS) {
      process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY_VALUE;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  // ── Test A ────────────────────────────────────────────────────────────────
  test('A) AbortError (timeout) NO llama notifyCriticalError aunque ocurra 2 veces', async () => {
    const abortErr = new DOMException('This operation was aborted', 'AbortError');
    global.fetch = jest.fn().mockRejectedValue(abortErr);

    // Simula 2 ciclos consecutivos de 10 min con timeout de red
    await _checkOpenAI();
    await _checkOpenAI();

    expect(notifyCriticalError).not.toHaveBeenCalled();
  });

  // ── Test B ────────────────────────────────────────────────────────────────
  test('B) Error HTTP real incrementa failCounter y dispara alerta al llegar a FAIL_THRESHOLD=2', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    // Primer fallo: failCounters.openai = 1 — por debajo del umbral
    await _checkOpenAI();
    expect(notifyCriticalError).not.toHaveBeenCalled();

    // Segundo fallo: failCounters.openai = 2 = FAIL_THRESHOLD → notifica
    await _checkOpenAI();
    expect(notifyCriticalError).toHaveBeenCalledTimes(1);
    expect(notifyCriticalError).toHaveBeenCalledWith(
      'Health Monitor — OpenAI',
      expect.objectContaining({ message: 'HTTP 500' })
    );
  });

  // ── Test C ────────────────────────────────────────────────────────────────
  test('C) Check exitoso devuelve true y no genera ninguna alerta', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await _checkOpenAI();

    expect(result).toBe(true);
    expect(notifyCriticalError).not.toHaveBeenCalled();
  });

  // ── Test 429 ──────────────────────────────────────────────────────────────
  test('429 (rate limit) se trata como servicio UP — no genera alerta', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });

    const result = await _checkOpenAI();

    expect(result).toBe(true);
    expect(notifyCriticalError).not.toHaveBeenCalled();
  });

  // ── Test D — mecanismo real del timeout ────────────────────────────────────
  test('D) mecanismo real: setTimeout 15s → controller.abort() → AbortError → false, sin alerta crítica', async () => {
    jest.useFakeTimers();
    try {
      // fetch que queda suspendido hasta que controller.signal sea abortado
      global.fetch = jest.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('This operation was aborted', 'AbortError'));
          });
        });
      });

      // Lanzar sin await — el reloj está congelado, fetch no resuelve todavía
      const checkPromise = _checkOpenAI();

      // Avanzar 15001ms virtuales → dispara setTimeout(abort, 15000) → signal fires → fetch rechaza
      await jest.advanceTimersByTimeAsync(15001);

      const result = await checkPromise;

      expect(result).toBe(false);
      expect(notifyCriticalError).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      // Restaurar timers reales aunque el test falle
      jest.useRealTimers();
    }
  });
});
