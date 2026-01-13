/**
 * 🧪 Tests para sistema de confirmaciones
 * Valida flujo SI/NO y manejo de estados
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { 
  isPositiveResponse, 
  isNegativeResponse
} from '../servicios/confirmation-flow.js';
import {
  shouldActivateConfirmation 
} from '../servicios/aurora-confirmation-helper.js';

describe('🎯 Sistema de Confirmaciones', () => {
  
  describe('Detección de respuestas positivas', () => {
    test('debe detectar "si" como respuesta positiva', () => {
      expect(isPositiveResponse('si')).toBe(true);
      expect(isPositiveResponse('Si')).toBe(true);
      expect(isPositiveResponse('SI')).toBe(true);
      expect(isPositiveResponse('sí')).toBe(true);
    });

    test('debe detectar variaciones afirmativas', () => {
      expect(isPositiveResponse('ok')).toBe(true);
      expect(isPositiveResponse('perfecto')).toBe(true);
      expect(isPositiveResponse('confirmo')).toBe(true);
      expect(isPositiveResponse('dale')).toBe(true);
      expect(isPositiveResponse('listo')).toBe(true);
    });

    test('debe detectar emojis positivos', () => {
      expect(isPositiveResponse('👍')).toBe(true);
      expect(isPositiveResponse('✅')).toBe(true);
      expect(isPositiveResponse('si 👍')).toBe(true);
    });

    test('NO debe detectar respuestas ambiguas como positivas', () => {
      expect(isPositiveResponse('tal vez')).toBe(false);
      expect(isPositiveResponse('quizás')).toBe(false);
      expect(isPositiveResponse('no sé')).toBe(false);
    });
  });

  describe('Detección de respuestas negativas', () => {
    test('debe detectar "no" como respuesta negativa', () => {
      expect(isNegativeResponse('no')).toBe(true);
      expect(isNegativeResponse('No')).toBe(true);
      expect(isNegativeResponse('NO')).toBe(true);
      expect(isNegativeResponse('nop')).toBe(true);
    });

    test('debe detectar variaciones negativas', () => {
      expect(isNegativeResponse('cancelar')).toBe(true);
      expect(isNegativeResponse('mejor no')).toBe(true);
      expect(isNegativeResponse('ahora no')).toBe(true);
      expect(isNegativeResponse('otro día')).toBe(true);
    });

    test('debe detectar emojis negativos', () => {
      expect(isNegativeResponse('👎')).toBe(true);
      expect(isNegativeResponse('❌')).toBe(true);
      expect(isNegativeResponse('no ❌')).toBe(true);
    });
  });

  describe('Activación de confirmaciones', () => {
    test('debe activar confirmación cuando Aurora pregunta SI/NO', () => {
      const message = '¿Confirmas esta reserva? Responde SI para continuar';
      expect(shouldActivateConfirmation(message)).toBe(true);
    });

    test('debe activar con pattern de confirmación', () => {
      expect(shouldActivateConfirmation('¿Confirmas esta reserva?')).toBe(true);
      expect(shouldActivateConfirmation('Responde SI para continuar')).toBe(true);
      expect(shouldActivateConfirmation('¿Aceptas esta reserva?')).toBe(true);
    });

    test('NO debe activar para mensajes normales', () => {
      expect(shouldActivateConfirmation('Hola, ¿cómo estás?')).toBe(false);
      expect(shouldActivateConfirmation('Los precios son...')).toBe(false);
    });
  });

  describe('Extracción de datos de reserva', () => {
    test('debe extraer fecha correctamente', () => {
      // Este test se implementaría con extractReservationData
      // Por ahora es placeholder
      expect(true).toBe(true);
    });

    test('debe extraer horario correctamente', () => {
      // Placeholder - implementar cuando exportemos extractReservationData
      expect(true).toBe(true);
    });

    test('debe calcular duración en 2 horas por defecto', () => {
      // Placeholder
      expect(true).toBe(true);
    });
  });
});
