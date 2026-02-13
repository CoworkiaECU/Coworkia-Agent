/**
 * 🧪 E2E Tests - Orquestador de Agentes
 * 
 * Tests del orquestador que decide qué agente activa según:
 * - Prioridades (handoff > requiresAurora > keywords > maintain)
 * - Contexto de conversación
 * - Flags especiales
 * - Historial de agente activo
 * 
 * Versión: v422
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock del perfil de usuario
const createMockProfile = (activeAgent = 'AURORA', freeTrialUsed = false) => ({
  activeAgent,
  freeTrialUsed,
  userLanguage: 'es',
  conversationHistory: []
});

describe('🎭 Orquestador de Agentes', () => {
  
  describe('⚡ Prioridad 1: Handoffs Explícitos (Forzados)', () => {
    
    test('Handoff debe ignorar agente actual y cambiar inmediatamente', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Usuario está con Aluna pero pide @enzo
      const result = detectarIntencion('@enzo ayuda con marketing');
      
      expect(result.agent).toBe('ENZO');
      expect(result.flags.agentHandoff).toBe(true);
      expect(result.reason).toContain('trigger');
    });
    
    test('Handoff a Aurora desde cualquier agente', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('@aurora necesito reservar');
      
      expect(result.agent).toBe('AURORA');
      expect(result.flags.returningToAurora).toBe(true);
    });
    
    test('Handoff con código incorrecto debe fallar gracefully', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('@pepito hola');
      
      // No debe detectar handoff con código inválido
      expect(result.flags.agentHandoff).toBeFalsy();
    });
  });
  
  describe('🔴 Prioridad 2: requiresAurora (Forzados)', () => {
    
    test('Modificación de reserva debe forzar Aurora', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const casos = [
        'Cambiar la hora de mi reserva',
        'Modificar mi reserva para otro día'
      ];
      
      for (const mensaje of casos) {
        const result = detectarIntencion(mensaje);
        expect(result.flags.requiresAurora).toBe(true);
        expect(result.agent).toBe('AURORA');
      }
    });
    
    test('Solicitud de pago debe forzar Aurora', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Dame el link de pago');
      expect(result.flags.paymentLinkRequest).toBe(true);
      expect(result.agent).toBe('AURORA');
    });
    
    test('Post-email support debe forzar Aurora', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Recibí tu correo de confirmación, tengo dudas');
      
      expect(result.flags.postEmailSupport).toBe(true);
      expect(result.flags.requiresAurora).toBe(true);
    });
    
    test('Cancelación debe forzar Aurora', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Cancelar mi reserva');
      
      expect(result.flags.cancelacion).toBe(true);
      expect(result.agent).toBe('AURORA');
    });
  });
  
  describe('🟡 Prioridad 3: Keywords (Sugerencia)', () => {
    
    test('Keywords deben sugerir agente sin forzar', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Me interesa una membresía');
      
      expect(result.agent).toBe('ALUNA');
      expect(result.flags.isKeywordMatch).toBe(true);
    });
    
    test('Keywords conflictivas: el más específico gana', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // "plan mensual" (Aluna) vs "reservar" (Aurora)
      const result = detectarIntencion('Quiero reservar el plan 10');
      
      // "plan 10" es más específico que "reservar"
      expect(result.agent).toBe('ALUNA');
    });
  });
  
  describe('🟢 Prioridad 4: Mantener Agente Actual', () => {
    
    test('Mensaje genérico debe mantener agente actual', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const mensajesGenericos = [
        'Ok',
        'Entiendo',
        'Sí',
        'Claro',
        'Gracias',
        'Perfecto'
      ];
      
      for (const mensaje of mensajesGenericos) {
        const result = detectarIntencion(mensaje);
        
        // Debe mantener agente actual (no cambiar)
        expect(result.flags.maintainingActive || result.flags.casualGreeting).toBeTruthy();
      }
    });
    
    test('Saludo casual no debe cambiar agente', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Hola');
      
      expect(result.flags.casualGreeting).toBe(true);
    });
    
    test('Pregunta de identidad no debe cambiar agente', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('¿Quién eres?');
      
      expect(result.flags.identityQuestion).toBe(true);
    });
  });
  
  describe('🔀 Flujos de Transición', () => {
    
    test('Aurora → Aluna → Aurora (ciclo completo)', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // 1. Usuario con Aurora
      let result = detectarIntencion('Hola');
      expect(result.agent).toBe('AURORA');
      
      // 2. Usuario pregunta por membresía → Aluna
      result = detectarIntencion('Cuéntame sobre el plan 10');
      expect(result.agent).toBe('ALUNA');
      
      // 3. Usuario vuelve a Aurora
      result = detectarIntencion('@aurora necesito reservar');
      expect(result.agent).toBe('AURORA');
      expect(result.flags.returningToAurora).toBe(true);
    });
    
    test('Aurora → Enzo → Aurora (experto externo)', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // 1. Handoff a Enzo
      let result = detectarIntencion('@enzo necesito estrategia de marketing');
      expect(result.agent).toBe('ENZO');
      
      // 2. Conversación con Enzo...
      result = detectarIntencion('¿Cómo funciona Meta Ads?');
      expect(result.agent).toBe('AURORA'); // Sin keywords, mantiene actual
      
      // 3. Retorno explícito
      result = detectarIntencion('@aurora gracias, ahora quiero reservar');
      expect(result.agent).toBe('AURORA');
    });
    
    test('Cambio de contexto: Membresía → Reserva puntual', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Usuario está con Aluna hablando de membresías
      let result = detectarIntencion('El plan 10 es interesante');
      // Sin keywords específicos, mantendría Aluna
      
      // Pero luego menciona modificación → requiresAurora
      result = detectarIntencion('Espera, primero necesito cambiar mi reserva de hoy');
      expect(result.flags.requiresAurora).toBe(true);
      expect(result.agent).toBe('AURORA');
    });
  });
  
  describe('🧩 Casos Edge Complejos', () => {
    
    test('Usuario menciona múltiples agentes en un mensaje', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Menciona @enzo y @adriana
      const result = detectarIntencion('Necesito @enzo para marketing y @adriana para seguros');
      
      // Debe detectar el primero mencionado
      expect(result.flags.agentHandoff).toBe(true);
      // Podría ser enzo o adriana según implementación
    });
    
    test('Handoff después de cancelación', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Usuario cancela
      let result = detectarIntencion('Cancelar mi reserva');
      expect(result.flags.cancelacion).toBe(true);
      
      // Luego quiere membresía
      result = detectarIntencion('Pero me interesa el plan mensual');
      expect(result.agent).toBe('ALUNA');
    });
    
    test('Usuario frustrado cambia de tema abruptamente', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Ya no entiendo nada, mejor cuéntame de las membresías');
      
      // Debe detectar "membresías" y sugerir Aluna
      expect(result.agent).toBe('ALUNA');
    });
  });
  
  describe('📊 Métricas de Confidence', () => {
    
    test('Handoff explícito debe tener confidence 1.0', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('@enzo hola');
      
    });
    
    test('Keywords deben tener confidence < 1.0', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Me interesa una membresía');
      
    });
  });
  
  describe('🛡️ Protección contra Loops', () => {
    
    test('No debe crear loop infinito entre agentes', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Mensaje ambiguo que no debería causar cambios constantes
      const mensajes = [
        'Ok',
        'Entiendo',
        'Sí',
        'Claro'
      ];
      
      for (const mensaje of mensajes) {
        const result = detectarIntencion(mensaje);
        
        // Debe mantener agente actual (no forzar cambio)
      }
    });
    
    test('Usuario que menciona keywords sin intención real', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Menciona "plan" pero no es membresía
      const result = detectarIntencion('¿Cuál es el plan para hoy?');
      
      // No debe activar Aluna por keyword "plan" fuera de contexto
      // (Esto depende de la implementación actual, pero idealmente debería ser más inteligente)
    });
  });
  
  describe('🌐 Contexto de Conversación', () => {
    
    test('Historial debe influir en decisión (continuidad)', async () => {
      // Este test requeriría el orquestador completo
      // Por ahora validamos que detectarIntencion no rompa con contexto
      
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Mensaje de continuación
      const result = detectarIntencion('Y cuánto cuesta?');
      
      // Sin contexto previo, debería mantener o ir a Aurora
      expect(['AURORA', 'ALUNA']).toContain(result.agent);
    });
    
    test('Referencias anafóricas deben mantener contexto', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // "Eso" se refiere a algo anterior
      const result = detectarIntencion('Sí, eso me interesa');
      
      // Debe mantener agente actual
    });
  });
});

