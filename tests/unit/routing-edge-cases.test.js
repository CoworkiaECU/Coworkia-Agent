import { describe, test, expect, beforeEach } from '@jest/globals';
import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';

describe('🎯 Routing Edge Cases', () => {
  
  describe('Saludos + @menciones', () => {
    test('saludo casual sin contexto → AURORA', () => {
      const intent = detectarIntencion('Hola buenos días', 'AURORA');
      expect(intent.agent).toBe('AURORA');
      expect(intent.reason).toContain('saludo');
    });

    test('saludo + @enzo explícito → ENZO (handoff)', () => {
      const intent = detectarIntencion('Hola @enzo necesito marketing', 'AURORA');
      expect(intent.agent).toBe('ENZO');
      expect(intent.flags?.agentHandoff).toBe(true);
      expect(intent.reason).toContain('@enzo');
    });

    test('saludo + @aurora desde ENZO → AURORA (return)', () => {
      const intent = detectarIntencion('Hola @aurora volvamos', 'ENZO');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.returningToAurora).toBe(true);
      expect(intent.reason).toContain('@aurora');
    });

    test('saludo + @aluna implícito → ALUNA pero sin forzar', () => {
      const intent = detectarIntencion('Hola quiero membresía mensual', 'AURORA');
      expect(intent.agent).toBe('ALUNA');
      expect(intent.flags?.suggestedAgent).toBe(true);
      expect(intent.flags?.agentHandoff).toBeUndefined(); // No forzar
    });
  });

  describe('Keywords sin forzar handoff', () => {
    test('usuario con ENZO dice "membresía" → mantiene ENZO', () => {
      const intent = detectarIntencion('¿tu membresía incluye soporte?', 'ENZO');
      // Si activeAgent !== AURORA, suggestedAgent NO debe cambiar
      expect(intent.flags?.suggestedAgent).toBe(true);
      expect(intent.flags?.agentHandoff).toBeUndefined();
      // El decidirAgente() debe mantener ENZO
    });

    test('usuario con AURORA dice "membresía" → sugiere ALUNA', () => {
      const intent = detectarIntencion('quiero info de membresías', 'AURORA');
      expect(intent.agent).toBe('ALUNA');
      expect(intent.flags?.suggestedAgent).toBe(true);
      expect(intent.flags?.agentHandoff).toBeUndefined();
    });

    test('usuario con ADRIANA dice "coworking" → NO cambia', () => {
      const intent = detectarIntencion('trabajo en coworking cerca', 'ADRIANA');
      // Keyword "coworking" detectado pero no debe forzar handoff
      expect(intent.flags?.agentHandoff).toBeUndefined();
    });
  });

  describe('Cancelación sin flujo activo', () => {
    test('"no sé" casual → detecta cancelación pero NO ejecuta', () => {
      const intent = detectarIntencion('no sé qué hacer', 'AURORA');
      expect(intent.flags?.cancelacion).toBe(true);
      // El orquestador debe validar hasPendingConfirmation/hasPartialForm
      // y setear cancelacionIgnorada si no hay flujo
    });

    test('"cancela" sin contexto → flag cancelación', () => {
      const intent = detectarIntencion('cancela todo', 'AURORA');
      expect(intent.flags?.cancelacion).toBe(true);
    });

    test('"no gracias" → flag cancelación', () => {
      const intent = detectarIntencion('no gracias, mejor no', 'AURORA');
      expect(intent.flags?.cancelacion).toBe(true);
    });
  });

  describe('RequiresAurora (reservas/pagos)', () => {
    test('agente dice "reservar sala" → AURORA obligatorio', () => {
      const intent = detectarIntencion('quiero reservar sala reunión', 'ENZO');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.requiresAurora).toBe(true);
      expect(intent.reason).toContain('reserva');
    });

    test('agente dice "pagué" → AURORA obligatorio', () => {
      const intent = detectarIntencion('ya pagué la transferencia', 'ALUNA');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.requiresAurora).toBe(true);
    });

    test('agente dice "cambiar fecha" → AURORA obligatorio', () => {
      const intent = detectarIntencion('necesito cambiar fecha reserva', 'ENZO');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.requiresAurora).toBe(true);
    });
  });

  describe('SuggestedAgent vs AgentHandoff', () => {
    test('keyword "seguro" con AURORA → sugiere ADRIANA', () => {
      const intent = detectarIntencion('necesito seguro de auto', 'AURORA');
      expect(intent.agent).toBe('ADRIANA');
      expect(intent.flags?.suggestedAgent).toBe(true);
      expect(intent.flags?.agentHandoff).toBeUndefined();
    });

    test('keyword "seguro" con ENZO → NO cambia (mantiene ENZO)', () => {
      const intent = detectarIntencion('mi campaña es segura?', 'ENZO');
      // La palabra "seguro" aparece pero en contexto diferente
      // decidirAgente() debe mantener ENZO por prioridad 4
      expect(intent.flags?.agentHandoff).toBeUndefined();
    });

    test('@mención explícita SIEMPRE fuerza cambio', () => {
      const intent = detectarIntencion('hola @adriana tengo pregunta', 'ENZO');
      expect(intent.agent).toBe('ADRIANA');
      expect(intent.flags?.agentHandoff).toBe(true);
      expect(intent.reason).toContain('@adriana');
    });
  });

  describe('Paula out-of-scope detection', () => {
    test('PAULA + "coworkia" → handoff AURORA', () => {
      const intent = detectarIntencion('quiero info de coworkia', 'PAULA');
      // detectPaulaOutOfScope debe detectar y forzar handoff
      // Este test valida que la lógica del orquestador funcione
      expect(intent.agent).not.toBe('PAULA'); // Debe cambiar
    });

    test('PAULA + "seguro de vida" → handoff ADRIANA', () => {
      const intent = detectarIntencion('necesito seguro de vida', 'PAULA');
      expect(intent.agent).toBe('ADRIANA');
    });

    test('PAULA + bienes raíces → mantiene PAULA', () => {
      const intent = detectarIntencion('quiero vender mi casa', 'PAULA');
      expect(intent.agent).toBe('PAULA');
    });
  });

  describe('Casos combinados complejos', () => {
    test('saludo + keyword + @mención → @mención gana', () => {
      const intent = detectarIntencion('Hola necesito membresía @enzo ayuda', 'AURORA');
      expect(intent.agent).toBe('ENZO');
      expect(intent.flags?.agentHandoff).toBe(true);
      // @mención tiene prioridad 1 sobre keyword (prioridad 5)
    });

    test('requiresAurora + keyword diferente → AURORA gana', () => {
      const intent = detectarIntencion('quiero pagar mi seguro de membresía', 'ADRIANA');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.requiresAurora).toBe(true);
      // Prioridad 2 (requiresAurora) > prioridad 5 (suggestedAgent)
    });

    test('cancelación + @mención → @mención gana', () => {
      const intent = detectarIntencion('no quiero seguir, mejor @enzo ayudame', 'AURORA');
      expect(intent.agent).toBe('ENZO');
      expect(intent.flags?.agentHandoff).toBe(true);
      expect(intent.flags?.cancelacion).toBe(true);
      // Ambos flags presentes, @mención tiene prioridad 1
    });
  });

  describe('Mensajes ambiguos', () => {
    test('"ok" solo → AURORA sin flags especiales', () => {
      const intent = detectarIntencion('ok', 'AURORA');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.agentHandoff).toBeUndefined();
      expect(intent.flags?.suggestedAgent).toBeUndefined();
    });

    test('"gracias" solo → mantiene agente actual', () => {
      const intent = detectarIntencion('gracias!', 'ENZO');
      // No debe forzar cambio
      expect(intent.flags?.agentHandoff).toBeUndefined();
    });

    test('emoji solo → AURORA fallback', () => {
      const intent = detectarIntencion('👍', 'ALUNA');
      // Debe mantener agente o ir a AURORA
      expect(['AURORA', 'ALUNA']).toContain(intent.agent);
    });
  });
});
