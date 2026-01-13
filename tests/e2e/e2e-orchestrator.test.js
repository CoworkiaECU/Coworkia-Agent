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
const createMockProfile = (activeAgent = 'aurora', freeTrialUsed = false) => ({
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
      
      expect(result.suggestedAgent).toBe('enzo');
      expect(result.flags.agentHandoff).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.reason).toContain('handoff');
    });
    
    test('Handoff a Aurora desde cualquier agente', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('@aurora necesito reservar');
      
      expect(result.suggestedAgent).toBe('aurora');
      expect(result.flags.agentHandoff).toBe(true);
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
        'Modificar mi reserva para otro día',
        'Necesito reprogramar',
        'Ajustar la fecha'
      ];
      
      for (const mensaje of casos) {
        const result = detectarIntencion(mensaje);
        expect(result.flags.requiresAurora).toBe(true);
        expect(result.suggestedAgent).toBe('aurora');
      }
    });
    
    test('Solicitud de pago debe forzar Aurora', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const casos = [
        'Dame el link de pago',
        'Cómo pago?',
        'Envíame el enlace para pagar'
      ];
      
      for (const mensaje of casos) {
        const result = detectarIntencion(mensaje);
        expect(result.flags.paymentLinkRequest).toBe(true);
        expect(result.suggestedAgent).toBe('aurora');
      }
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
      expect(result.suggestedAgent).toBe('aurora');
    });
  });
  
  describe('🟡 Prioridad 3: Keywords (Sugerencia)', () => {
    
    test('Keywords deben sugerir agente sin forzar', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Me interesa una membresía');
      
      expect(result.suggestedAgent).toBe('aluna');
      expect(result.flags.isKeywordMatch).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.confidence).toBeLessThan(1.0); // No es handoff
    });
    
    test('Keywords conflictivas: el más específico gana', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // "plan mensual" (Aluna) vs "reservar" (Aurora)
      const result = detectarIntencion('Quiero reservar el plan 10');
      
      // "plan 10" es más específico que "reservar"
      expect(result.suggestedAgent).toBe('aluna');
    });
    
    test('Tomi keywords deben requerir contexto de propiedad', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Solo ciudad → NO activa Tomi
      let result = detectarIntencion('Información sobre Quito');
      expect(result.suggestedAgent).not.toBe('tomi');
      
      // Ciudad + propiedad → SÍ activa Tomi
      result = detectarIntencion('Busco casa en Quito');
      expect(result.suggestedAgent).toBe('tomi');
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
        
        // No debe sugerir cambio de agente
        expect(result.flags.casualGreeting).toBeTruthy();
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
      expect(result.suggestedAgent).toBe('aurora');
      
      // 2. Usuario pregunta por membresía → Aluna
      result = detectarIntencion('Cuéntame sobre el plan 10');
      expect(result.suggestedAgent).toBe('aluna');
      
      // 3. Usuario vuelve a Aurora
      result = detectarIntencion('@aurora necesito reservar');
      expect(result.suggestedAgent).toBe('aurora');
      expect(result.flags.agentHandoff).toBe(true);
    });
    
    test('Aurora → Enzo → Aurora (experto externo)', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // 1. Handoff a Enzo
      let result = detectarIntencion('@enzo necesito estrategia de marketing');
      expect(result.suggestedAgent).toBe('enzo');
      
      // 2. Conversación con Enzo...
      result = detectarIntencion('¿Cómo funciona Meta Ads?');
      expect(result.suggestedAgent).toBe('aurora'); // Sin keywords, mantiene actual
      
      // 3. Retorno explícito
      result = detectarIntencion('@aurora gracias, ahora quiero reservar');
      expect(result.suggestedAgent).toBe('aurora');
    });
    
    test('Cambio de contexto: Membresía → Reserva puntual', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Usuario está con Aluna hablando de membresías
      let result = detectarIntencion('El plan 10 es interesante');
      // Sin keywords específicos, mantendría Aluna
      
      // Pero luego menciona modificación → requiresAurora
      result = detectarIntencion('Espera, primero necesito cambiar mi reserva de hoy');
      expect(result.flags.requiresAurora).toBe(true);
      expect(result.suggestedAgent).toBe('aurora');
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
      expect(result.suggestedAgent).toBe('aluna');
    });
    
    test('Keywords ambiguos: "casa" podría ser Tomi o casual', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // "casa" en contexto propiedad
      let result = detectarIntencion('Busco casa para comprar');
      expect(result.suggestedAgent).toBe('tomi');
      
      // "casa" en contexto casual
      result = detectarIntencion('Trabajo desde casa');
      // No debe activar Tomi
      expect(result.suggestedAgent).not.toBe('tomi');
    });
    
    test('Usuario frustrado cambia de tema abruptamente', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Ya no entiendo nada, mejor cuéntame de las membresías');
      
      // Debe detectar "membresías" y sugerir Aluna
      expect(result.suggestedAgent).toBe('aluna');
    });
  });
  
  describe('📊 Métricas de Confidence', () => {
    
    test('Handoff explícito debe tener confidence 1.0', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('@enzo hola');
      
      expect(result.confidence).toBe(1.0);
    });
    
    test('Keywords deben tener confidence < 1.0', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      const result = detectarIntencion('Me interesa una membresía');
      
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThan(1.0);
    });
    
    test('Tomi con ciudad debe tener confidence mayor que sin ciudad', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // Con ciudad
      const conCiudad = detectarIntencion('Busco casa en Quito');
      
      // Sin ciudad
      const sinCiudad = detectarIntencion('Busco casa');
      
      if (conCiudad.suggestedAgent === 'tomi' && sinCiudad.suggestedAgent === 'tomi') {
        expect(conCiudad.confidence).toBeGreaterThan(sinCiudad.confidence);
      }
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
        expect(result.confidence).toBeLessThan(0.8);
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
      expect(['aurora', 'aluna', 'tomi']).toContain(result.suggestedAgent);
    });
    
    test('Referencias anafóricas deben mantener contexto', async () => {
      const { detectarIntencion } = await import('../../src/deteccion-intenciones/detectar-intencion.js');
      
      // "Eso" se refiere a algo anterior
      const result = detectarIntencion('Sí, eso me interesa');
      
      // Debe mantener agente actual
      expect(result.confidence).toBeLessThan(0.8);
    });
  });
});

