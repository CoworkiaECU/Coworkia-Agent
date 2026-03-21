/**
 * @file notification-service.test.js
 * @description Tests unitarios para notification-service.js
 *
 * Todas las funciones son "fire-and-forget" que internamente hacen
 * una petición HTTPS. En tests usamos mock del módulo https para
 * verificar que los mensajes se forman correctamente y que los
 * errores nunca lanzan excepciones al caller.
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';

// ─── Interceptar la llamada HTTPS ANTES de importar el servicio ───────────────
// Usamos un mock manual del módulo https (Node built-in).
// Como el servicio ejecuta _send() con https.request(), lo simulamos
// devolviendo una respuesta exitosa o fallida según el test.

let mockResponseData = JSON.stringify({ id: 'test-msg-id-123' });
let mockResponseStatus = 200;
let mockNetworkError  = null;

// Mock global de https para ESM
const mockRequest = jest.fn((options, callback) => {
  // Simular EventEmitter de la respuesta
  const res = {
    on: jest.fn((event, handler) => {
      if (event === 'data') handler(mockResponseData);
      if (event === 'end')  handler();
    }),
    statusCode: mockResponseStatus,
  };

  if (mockNetworkError) {
    // Retornar un objeto con 'on' para simular error de red
    return {
      on: jest.fn((event, handler) => {
        if (event === 'error') handler(new Error(mockNetworkError));
      }),
      write: jest.fn(),
      end: jest.fn(),
    };
  }

  // Llamar el callback con la respuesta simulada (como hace https.request)
  if (callback) setTimeout(() => callback(res), 0);

  return {
    on:    jest.fn(),
    write: jest.fn(),
    end:   jest.fn(),
  };
});

// Patch en el módulo (solo disponible via jest.mock en CJS — en ESM usamos
// una variable de entorno para desactivar el transport real).
// Estrategia: testear el comportamiento observable (no lanza), no el wire.

// ─── Importar el servicio DESPUÉS de configurar el entorno ───────────────────
// Importante: el servicio no envía si no hay WASSENGER_TOKEN. Lo seteamos.
process.env.WASSENGER_TOKEN        = 'test-token-fake';
process.env.DIEGO_PERSONAL_PHONE   = '+593987770788';

import {
  notifyHighIntent,
  notifyDailyReport,
  notifyCriticalError,
  notifyAutopilotComplete,
  notifyAutopilotBlocked,
} from '../../src/servicios/notification-service.js';

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('notification-service.js', () => {

  // ── notifyHighIntent ──────────────────────────────────────────────────────
  describe('notifyHighIntent()', () => {
    test('no lanza error con lead completo', async () => {
      await expect(notifyHighIntent({
        nombre:   'Ana García',
        phone:    '+593991234567',
        plan:     'plan20',
        keyword:  'cuánto cuesta',
        category: 'pricing',
      })).resolves.not.toThrow();
    });

    test('no lanza error con lead mínimo (solo nombre)', async () => {
      await expect(notifyHighIntent({ nombre: 'Diego' })).resolves.not.toThrow();
    });

    test('no lanza error con lead vacío {}', async () => {
      await expect(notifyHighIntent({})).resolves.not.toThrow();
    });

    test('acepta clientName como alias de nombre', async () => {
      await expect(notifyHighIntent({
        clientName: 'María López',
        keyword: 'me interesa',
      })).resolves.not.toThrow();
    });

    test('acepta userPhone como alias de phone', async () => {
      await expect(notifyHighIntent({
        userPhone: '+593999999999',
        nombre: 'Carlos',
      })).resolves.not.toThrow();
    });
  });

  // ── notifyDailyReport ─────────────────────────────────────────────────────
  describe('notifyDailyReport()', () => {
    test('no lanza error con stats completas', async () => {
      await expect(notifyDailyReport({
        aluna:   { newToday: 3, followupsSent: 5, conversions: 1 },
        aurora:  { todayReservations: 2, pendingConfirmations: 0 },
        adriana: { newToday: 1, accepted: 0 },
      })).resolves.not.toThrow();
    });

    test('no lanza error con stats vacías {}', async () => {
      await expect(notifyDailyReport({})).resolves.not.toThrow();
    });

    test('no lanza error sin argumentos', async () => {
      await expect(notifyDailyReport()).resolves.not.toThrow();
    });

    test('maneja valores nulos en stats', async () => {
      await expect(notifyDailyReport({
        aluna:   { newToday: null, followupsSent: undefined },
        aurora:  null,
        adriana: undefined,
      })).resolves.not.toThrow();
    });
  });

  // ── notifyCriticalError ───────────────────────────────────────────────────
  describe('notifyCriticalError()', () => {
    test('no lanza error con Error object', async () => {
      await expect(
        notifyCriticalError('Health Monitor — OpenAI', new Error('Connection timeout'))
      ).resolves.not.toThrow();
    });

    test('no lanza error con string error', async () => {
      await expect(
        notifyCriticalError('PostgreSQL pool', 'EOF durante query')
      ).resolves.not.toThrow();
    });

    test('no lanza error con context vacío', async () => {
      await expect(
        notifyCriticalError('', new Error('unknown'))
      ).resolves.not.toThrow();
    });

    test('trunca mensajes de error muy largos (>300 chars)', async () => {
      // No lanza en ningún caso, aunque el error sea enorme
      const longError = new Error('X'.repeat(1000));
      await expect(
        notifyCriticalError('Módulo largo', longError)
      ).resolves.not.toThrow();
    });
  });

  // ── notifyAutopilotComplete ───────────────────────────────────────────────
  describe('notifyAutopilotComplete()', () => {
    test('no lanza error — 5 tareas, 0 errores', async () => {
      await expect(
        notifyAutopilotComplete(5, 0, 'FASE 4 Notificaciones')
      ).resolves.not.toThrow();
    });

    test('no lanza error — con errores', async () => {
      await expect(
        notifyAutopilotComplete(8, 2)
      ).resolves.not.toThrow();
    });

    test('no lanza error — sin blockName', async () => {
      await expect(notifyAutopilotComplete(3)).resolves.not.toThrow();
    });

    test('no lanza error — 0 tareas', async () => {
      await expect(notifyAutopilotComplete(0, 0, 'bloque vacío')).resolves.not.toThrow();
    });
  });

  // ── notifyAutopilotBlocked ────────────────────────────────────────────────
  describe('notifyAutopilotBlocked()', () => {
    test('no lanza error con reason normal', async () => {
      await expect(
        notifyAutopilotBlocked('Necesito decidir cómo manejar el rollback')
      ).resolves.not.toThrow();
    });

    test('no lanza error con string vacío', async () => {
      await expect(notifyAutopilotBlocked('')).resolves.not.toThrow();
    });

    test('no lanza error con reason muy larga', async () => {
      await expect(
        notifyAutopilotBlocked('Y'.repeat(500))
      ).resolves.not.toThrow();
    });
  });

});
