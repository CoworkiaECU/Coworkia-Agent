import { describe, test, expect, beforeEach } from '@jest/globals';
import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';

describe('🎯 Routing Edge Cases', () => {
  
  describe('Saludos + @menciones', () => {
    test('saludo casual sin contexto → AURORA', () => {
      const intent = detectarIntencion('Hola buenos días', 'AURORA');
      expect(intent.agent).toBe('AURORA');
      expect(intent.reason).toContain('greeting');
    });

    test('saludo + @enzo explícito → ENZO (handoff)',() => {
      const intent = detectarIntencion('Hola @enzo cómo estás?', 'AURORA');
      expect(intent.agent).toBe('ENZO');
      expect(intent.flags?.agentHandoff).toBe(true);
      expect(intent.reason).toMatch(/trigger @Enzo/i);
    });

    test('saludo + @aurora desde ENZO → AURORA (return)', () => {
      const intent = detectarIntencion('Hola @aurora volvamos', 'ENZO');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.returningToAurora).toBe(true);
      expect(intent.reason).toMatch(/trigger @Aurora/i);
    });

    test('saludo + keyword membresía → ALUNA (keyword toma prioridad sobre saludo)', () => {
      const intent = detectarIntencion('Hola quiero membresía mensual', 'AURORA');
      // Excepción documentada: saludo + Aluna keyword → handoff a ALUNA (no casualGreeting)
      expect(intent.agent).toBe('ALUNA');
      expect(intent.flags?.agentHandoff).toBe(true);
    });
  });

  describe('Keywords sin forzar handoff - CON STICKY AGENTS', () => {
    test('usuario con ENZO dice "membresía" → mantiene ENZO (sticky)', () => {
      const intent = detectarIntencion('¿tu membresía incluye soporte?', 'ENZO');
      // Sticky Agents: ENZO se mantiene sin importar keywords
      expect(intent.agent).toBe('ENZO');
      expect(intent.reason).toContain('sticky_agent');
    });

    test('usuario con AURORA dice "membresía" → deriva a ALUNA', () => {
      const intent = detectarIntencion('quiero info de membresías', 'AURORA');
      // Aurora detecta tema Aluna y deriva al especialista
      expect(intent.agent).toBe('ALUNA');
      expect(intent.reason).toContain('aluna_keyword');
      expect(intent.flags?.suggestedAgent).toBe('ALUNA');
    });

    test('usuario con ADRIANA dice "coworking" → mantiene ADRIANA (sticky)', () => {
      const intent = detectarIntencion('trabajo en coworking cerca', 'ADRIANA');
      // Sticky Agents: ADRIANA se mantiene
      expect(intent.agent).toBe('ADRIANA');
      expect(intent.reason).toContain('sticky_agent');
    });
  });

  describe('Cancelación sin flujo activo', () => {
    test('"no sé" casual → NO detecta cancelación (conversación normal)', () => {
      const intent = detectarIntencion('no sé qué hacer', 'AURORA');
      // "no sé" no está en CANCELACION_PATTERNS (no es cancelación clara)
      expect(intent.flags?.cancelacion).toBeUndefined();
    });

    test('"cancela" exacto → flag cancelación', () => {
      const intent = detectarIntencion('cancela', 'AURORA');
      // /^cancela$/ requiere palabra exacta sin nada más
      expect(intent.flags?.cancelacion).toBe(true);
    });

    test('"no gracias" → flag cancelación', () => {
      const intent = detectarIntencion('no gracias, mejor no', 'AURORA');
      expect(intent.flags?.cancelacion).toBe(true);
    });
  });

  describe('RequiresAurora (reservas/pagos) - CON STICKY AGENTS', () => {
    test('agente dice "reservar sala" → MANTIENE ENZO (sticky agents)', () => {
      const intent = detectarIntencion('quiero reservar sala reunión', 'ENZO');
      // Sticky Agents: Solo @menciones cambian de agente
      expect(intent.agent).toBe('ENZO');
      expect(intent.reason).toContain('sticky_agent');
    });

    test('agente dice "pagué" en ALUNA → AURORA (retorno automático por keyword de pago)', () => {
      const intent = detectarIntencion('ya pagué la transferencia', 'ALUNA');
      // ALUNA→AURORA automático: 'transferencia' es AURORA_KEYWORD (confirmación de pago)
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.agentHandoff).toBe(true);
    });

    test('agente dice "cambiar fecha" → AURORA obligatorio', () => {
      const intent = detectarIntencion('necesito cambiar fecha reserva', 'ENZO');
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.requiresAurora).toBe(true);
    });
  });

  describe('SuggestedAgent vs AgentHandoff', () => {
    test('keyword "seguro" con AURORA → MANTIENE AURORA (no force)', () => {
      const intent = detectarIntencion('necesito seguro de auto', 'AURORA');
      // Keywords simples NO fuerzan cambios, solo @menciones
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.maintainingActive).toBe(true);
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
      // Razón ahora incluye "trigger @Adriana" con mayúscula
      expect(intent.reason).toMatch(/trigger @Adriana/i);
    });
  });

  describe('Paula out-of-scope detection - CON STICKY AGENTS', () => {
    test('PAULA + "coworkia" → MANTIENE PAULA (sticky)', () => {
      const intent = detectarIntencion('quiero info de coworkia', 'PAULA');
      // Sticky Agents: Paula se mantiene hasta @mención explícita
      // detectPaulaOutOfScope se maneja en orquestador, no en detectarIntencion
      expect(intent.agent).toBe('PAULA');
      expect(intent.reason).toContain('sticky_agent');
    });

    test('PAULA + "seguro de vida" → MANTIENE PAULA (sticky)', () => {
      const intent = detectarIntencion('necesito seguro de vida', 'PAULA');
      // Sticky: Solo @adriana forza cambio
      expect(intent.agent).toBe('PAULA');
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

    test('payment keyword → AURORA (override sticky)', () => {
      const intent = detectarIntencion('quiero pagar mi seguro de membresía', 'ADRIANA');
      // Payment requests tienen prioridad > sticky agents (Aurora procesa pagos)
      expect(intent.agent).toBe('AURORA');
      expect(intent.flags?.requiresAurora).toBe(true);
    });

    test('cancelación + @mención → @mención gana', () => {
      const intent = detectarIntencion('no quiero seguir, mejor @enzo ayudame', 'AURORA');
      expect(intent.agent).toBe('ENZO');
      expect(intent.flags?.agentHandoff).toBe(true);
      // @mención tiene prioridad 1, puede o no detectar cancelación simultánea
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
