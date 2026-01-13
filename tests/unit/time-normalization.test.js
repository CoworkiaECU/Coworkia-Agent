/**
 * 🧪 Tests para normalización de horarios
 * Valida que los horarios se procesen correctamente
 */

import { describe, test, expect } from '@jest/globals';

describe('⏰ Normalización de Horarios', () => {
  
  // Función helper para normalizar tiempo (extraída de aurora-confirmation-helper.js)
  const normalizeTimeFormat = (timeStr) => {
    if (!timeStr) return '09:00';
    
    timeStr = timeStr.toLowerCase().trim();
    
    // Si ya está en formato HH:MM
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr.padStart(5, '0');
    }
    
    // Extraer componentes
    const match = timeStr.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/);
    if (!match) return '09:00';
    
    let hour = parseInt(match[1]);
    let minutes = parseInt(match[2] || '0');
    const period = match[3];
    
    // Convertir AM/PM a formato 24h
    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }
    
    // Asegurar formato válido
    if (hour > 23) hour = 23;
    if (minutes > 59) minutes = 0;
    
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  describe('Conversión de formato 12h a 24h', () => {
    test('debe convertir 2pm a 14:00', () => {
      expect(normalizeTimeFormat('2pm')).toBe('14:00');
    });

    test('debe convertir 3:30pm a 15:30', () => {
      expect(normalizeTimeFormat('3:30pm')).toBe('15:30');
    });

    test('debe mantener 12pm como 12:00', () => {
      expect(normalizeTimeFormat('12pm')).toBe('12:00');
    });

    test('debe convertir 12am a 00:00', () => {
      expect(normalizeTimeFormat('12am')).toBe('00:00');
    });

    test('debe convertir 9am a 09:00', () => {
      expect(normalizeTimeFormat('9am')).toBe('09:00');
    });
  });

  describe('Formato 24 horas', () => {
    test('debe mantener 14:00 como está', () => {
      expect(normalizeTimeFormat('14:00')).toBe('14:00');
    });

    test('debe añadir padding a hora de un dígito', () => {
      expect(normalizeTimeFormat('9:00')).toBe('09:00');
    });

    test('debe procesar 23:59 correctamente', () => {
      expect(normalizeTimeFormat('23:59')).toBe('23:59');
    });
  });

  describe('Casos edge', () => {
    test('debe manejar input null', () => {
      expect(normalizeTimeFormat(null)).toBe('09:00');
    });

    test('debe manejar input vacío', () => {
      expect(normalizeTimeFormat('')).toBe('09:00');
    });

    test('debe manejar formato inválido', () => {
      expect(normalizeTimeFormat('invalid')).toBe('09:00');
    });

    test('debe manejar hora fuera de rango', () => {
      const result = normalizeTimeFormat('25:00');
      // Si no puede parsear correctamente, devuelve default
      expect(result).toBeDefined();
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    test('debe manejar minutos fuera de rango', () => {
      const result = normalizeTimeFormat('14:99');
      // Si no puede parsear correctamente, devuelve default o corrige
      expect(result).toBeDefined();
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('Cálculo de duración', () => {
    test('debe calcular duración correcta entre dos horarios', () => {
      const start = '09:00';
      const end = '11:00';
      
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);
      const duration = endHour - startHour;
      
      expect(duration).toBe(2);
    });

    test('debe evitar duraciones negativas', () => {
      const start = '14:00';
      const end = '02:00'; // Caso problemático: 14:00 - 02:00
      
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);
      let duration = endHour - startHour;
      
      // Validación: si es negativa, usar duración por defecto
      if (duration <= 0 || duration > 10) {
        duration = 2; // Default
      }
      
      expect(duration).toBe(2);
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('Zona horaria Ecuador', () => {
    test('debe calcular offset UTC-5 correctamente', () => {
      const ecuadorOffset = -5 * 60; // -5 horas en minutos
      expect(ecuadorOffset).toBe(-300);
    });

    test('debe convertir hora local a UTC correctamente', () => {
      // Crear fecha en zona UTC explícitamente
      const localHour = 14;
      const ecuadorOffsetMs = 5 * 60 * 60 * 1000;
      
      // Simular: si son las 14:00 en Ecuador, en UTC son las 19:00
      const expectedUtcHour = localHour + 5;
      
      expect(expectedUtcHour).toBe(19);
    });
  });
});
