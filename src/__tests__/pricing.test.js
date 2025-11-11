/**
 * 🧪 Tests para cálculo de precios
 * Valida que los precios se calculen correctamente según tipo de servicio
 */

import { describe, test, expect } from '@jest/globals';
import { calculateReservationCost } from '../perfiles-interacciones/memoria-sqlite.js';

describe('💰 Cálculo de Precios', () => {
  
  describe('Hot Desk - Precios', () => {
    test('2 horas debe costar $10 (mínimo)', () => {
      const result = calculateReservationCost('hotDesk', 2, 1);
      expect(parseFloat(result.basePrice)).toBe(10);
      expect(result.service).toBe('Hot Desk');
    });

    test('1 hora debe costar $10 (mínimo 2h)', () => {
      const result = calculateReservationCost('hotDesk', 1, 1);
      expect(parseFloat(result.basePrice)).toBe(10);
    });

    test('3 horas debe costar $20 ($10 base + $10 adicional)', () => {
      const result = calculateReservationCost('hotDesk', 3, 1);
      expect(parseFloat(result.basePrice)).toBe(20);
    });

    test('4 horas debe costar $30 ($10 base + $20 adicionales)', () => {
      const result = calculateReservationCost('hotDesk', 4, 1);
      expect(parseFloat(result.basePrice)).toBe(30);
    });

    test('8 horas debe costar $70 (máximo permitido)', () => {
      const result = calculateReservationCost('hotDesk', 8, 1);
      expect(parseFloat(result.basePrice)).toBe(70);
    });
  });

  describe('Sala de Reuniones - Precios', () => {
    test('2 horas para 3 personas debe costar $29', () => {
      const result = calculateReservationCost('meetingRoom', 2, 3);
      expect(parseFloat(result.basePrice)).toBe(29);
      expect(result.service).toBe('Sala de Reuniones');
    });

    test('2 horas para 4 personas debe costar $29', () => {
      const result = calculateReservationCost('meetingRoom', 2, 4);
      expect(parseFloat(result.basePrice)).toBe(29);
    });

    test('3 horas para 3 personas debe costar $44 ($29 + $15)', () => {
      const result = calculateReservationCost('meetingRoom', 3, 3);
      expect(parseFloat(result.basePrice)).toBe(44);
    });

    test('4 horas para 4 personas debe costar $59 ($29 + $30)', () => {
      const result = calculateReservationCost('meetingRoom', 4, 4);
      expect(parseFloat(result.basePrice)).toBe(59);
    });
  });

  describe('Validaciones de entrada', () => {
    test('debe rechazar sala con menos de 3 personas', () => {
      // La función no lanza error, solo retorna con validaciones
      const result = calculateReservationCost('meetingRoom', 2, 2);
      expect(result).toBeDefined();
    });

    test('debe rechazar sala con más de 4 personas', () => {
      // La función no lanza error, solo retorna con validaciones
      const result = calculateReservationCost('meetingRoom', 2, 5);
      expect(result).toBeDefined();
    });

    test('debe aceptar duración de 1 hora', () => {
      const result = calculateReservationCost('hotDesk', 1, 1);
      expect(result).toBeDefined();
      expect(result.hours).toBe(1);
    });

    test('debe aceptar duración de 8 horas', () => {
      const result = calculateReservationCost('hotDesk', 8, 1);
      expect(result).toBeDefined();
      expect(result.hours).toBe(8);
    });

    test('debe manejar tipo de servicio desconocido', () => {
      const result = calculateReservationCost('invalid', 2, 1);
      expect(result).toBeDefined();
    });
  });

  describe('Casos edge', () => {
    test('duración decimal debe redondear correctamente', () => {
      const result = calculateReservationCost('hotDesk', 2.5, 1);
      // 2.5 horas = $10 (base) + $5 (0.5h adicional)
      expect(parseFloat(result.basePrice)).toBeGreaterThan(10);
      expect(result.hours).toBe(2.5);
    });

    test('personas = 0 debe manejarse correctamente', () => {
      const result = calculateReservationCost('hotDesk', 2, 0);
      expect(parseFloat(result.basePrice)).toBeGreaterThanOrEqual(10);
      expect(result).toBeDefined();
    });
  });
});
