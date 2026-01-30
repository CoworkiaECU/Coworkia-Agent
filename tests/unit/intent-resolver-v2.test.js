/**
 * 🧪 Tests unitarios - Intent Resolver V2
 * 
 * Valida el nuevo sistema unificado de detección de intenciones
 * 
 * @date 30 Ene 2026
 */

import { describe, test, expect } from '@jest/globals';
import { 
  resolveIntent, 
  decideResponder, 
  INTENT_TYPES 
} from '../../src/deteccion-intenciones/intent-resolver-v2.js';

describe('🎯 Intent Resolver V2 - Sistema Unificado', () => {
  
  describe('1. @menciones explícitas → HANDOFF', () => {
    
    test('debe detectar @enzo y retornar HANDOFF', () => {
      const intent = resolveIntent('@enzo necesito marketing', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
      expect(intent.targetAgent).toBe('ENZO');
      expect(intent.fromAgent).toBe('AURORA');
      expect(intent.isValid).toBe(true);
    });
    
    test('debe detectar @aluna desde ENZO (transición directa)', () => {
      const intent = resolveIntent('@aluna plan 10', 'ENZO');
      
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
      expect(intent.targetAgent).toBe('ALUNA');
      expect(intent.fromAgent).toBe('ENZO');
      expect(intent.isValid).toBe(true);
    });
    
    test('debe detectar @aurora para regresar', () => {
      const intent = resolveIntent('@aurora volver', 'ENZO');
      
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
      expect(intent.targetAgent).toBe('AURORA');
      expect(intent.fromAgent).toBe('ENZO');
      expect(intent.isValid).toBe(true);
    });
    
    test('debe funcionar con @mención en medio de texto', () => {
      const intent = resolveIntent('quiero hablar con @paula sobre propiedades', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
      expect(intent.targetAgent).toBe('PAULA');
    });
    
    test('debe detectar @ángela con acento', () => {
      const intent = resolveIntent('@ángela consulta médica', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
      expect(intent.targetAgent).toBe('ANGELA');
    });
  });
  
  describe('2. Keywords → SUGGESTION (NO handoff)', () => {
    
    test('keyword "marketing" debe sugerir ENZO sin cambiar agente', () => {
      const intent = resolveIntent('necesito marketing', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.SUGGESTION);
      expect(intent.targetAgent).toBe('AURORA'); // Mantiene Aurora
      expect(intent.suggestedAgent).toBe('ENZO'); // Solo sugiere Enzo
      expect(intent.shouldMentionSpecialist).toBe(true);
    });
    
    test('keyword "seguro" debe sugerir ADRIANA sin cambiar', () => {
      const intent = resolveIntent('quiero cotizar seguro', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.SUGGESTION);
      expect(intent.targetAgent).toBe('AURORA');
      expect(intent.suggestedAgent).toBe('ADRIANA');
    });
    
    test('keyword "doctor" debe sugerir ANGELA sin cambiar', () => {
      const intent = resolveIntent('necesito consulta con doctor', 'ENZO');
      
      expect(intent.type).toBe(INTENT_TYPES.SUGGESTION);
      expect(intent.targetAgent).toBe('ENZO'); // Mantiene Enzo activo
      expect(intent.suggestedAgent).toBe('ANGELA');
    });
    
    test('keyword "choque" debe sugerir AXEL', () => {
      const intent = resolveIntent('tuve un choque', 'PAULA');
      
      expect(intent.type).toBe(INTENT_TYPES.SUGGESTION);
      expect(intent.targetAgent).toBe('PAULA');
      expect(intent.suggestedAgent).toBe('AXEL');
    });
  });
  
  describe('3. Sin match → MAINTAIN', () => {
    
    test('mensaje sin keywords mantiene agente actual', () => {
      const intent = resolveIntent('hola como estas', 'ENZO');
      
      expect(intent.type).toBe(INTENT_TYPES.MAINTAIN);
      expect(intent.targetAgent).toBe('ENZO');
      expect(intent.reason).toBe('no_explicit_trigger');
    });
    
    test('email address no debe activar keywords', () => {
      const intent = resolveIntent('test@example.com', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.MAINTAIN);
      expect(intent.reason).toBe('email_address_skip');
    });
  });
  
  describe('4. Validación de transiciones', () => {
    
    test('transición válida AURORA → ENZO', () => {
      const intent = resolveIntent('@enzo', 'AURORA');
      
      expect(intent.isValid).toBe(true);
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
    });
    
    test('transición válida ENZO → ALUNA (directa)', () => {
      const intent = resolveIntent('@aluna', 'ENZO');
      
      expect(intent.isValid).toBe(true);
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
    });
    
    test('agente inválido debe usar AURORA por defecto', () => {
      const intent = resolveIntent('hola', 'AGENTE_INVALIDO');
      
      // Debe funcionar y normalizar a AURORA
      expect(intent.isValid).toBe(true);
    });
  });
  
  describe('5. decideResponder() - Decisión final', () => {
    
    test('HANDOFF debe retornar nuevo agente', () => {
      const intent = { 
        type: INTENT_TYPES.HANDOFF, 
        targetAgent: 'ENZO', 
        isValid: true 
      };
      
      const responder = decideResponder(intent, 'AURORA');
      expect(responder).toBe('ENZO');
    });
    
    test('SUGGESTION debe mantener agente actual', () => {
      const intent = { 
        type: INTENT_TYPES.SUGGESTION, 
        targetAgent: 'AURORA',
        suggestedAgent: 'ENZO',
        isValid: true 
      };
      
      const responder = decideResponder(intent, 'AURORA');
      expect(responder).toBe('AURORA');
    });
    
    test('MAINTAIN debe mantener agente actual', () => {
      const intent = { 
        type: INTENT_TYPES.MAINTAIN, 
        targetAgent: 'ENZO',
        isValid: true 
      };
      
      const responder = decideResponder(intent, 'ENZO');
      expect(responder).toBe('ENZO');
    });
  });
  
  describe('6. Edge cases', () => {
    
    test('mensaje vacío mantiene agente', () => {
      const intent = resolveIntent('', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.MAINTAIN);
      expect(intent.targetAgent).toBe('AURORA');
    });
    
    test('solo espacios mantiene agente', () => {
      const intent = resolveIntent('   ', 'ENZO');
      
      expect(intent.type).toBe(INTENT_TYPES.MAINTAIN);
      expect(intent.targetAgent).toBe('ENZO');
    });
    
    test('@mención en mayúsculas funciona', () => {
      const intent = resolveIntent('@ENZO AYUDA', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
      expect(intent.targetAgent).toBe('ENZO');
    });
    
    test('múltiples @menciones usa la primera', () => {
      const intent = resolveIntent('@enzo o @aluna', 'AURORA');
      
      expect(intent.type).toBe(INTENT_TYPES.HANDOFF);
      expect(intent.targetAgent).toBe('ENZO'); // Primera detectada
    });
  });
});
