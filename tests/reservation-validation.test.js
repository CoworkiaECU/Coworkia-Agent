/**
 * Tests para validaciones mejoradas de reservas
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateBusinessHours,
  validateDuration,
  validateReservationWindow,
  validateLunchBreak,
  validateReservation,
  suggestAlternativeSlots,
  formatValidationErrors,
  CONFIG
} from '../src/servicios/reservation-validation.js';

describe('Reservation Validation', () => {
  
  describe('validateDuration', () => {
    it('should reject durations less than 1 hour', () => {
      const result = validateDuration(0.5);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('mínima');
    });
    
    it('should reject durations more than 8 hours', () => {
      const result = validateDuration(9);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('máxima');
    });
    
    it('should accept valid durations (1-8 hours)', () => {
      expect(validateDuration(1).valid).toBe(true);
      expect(validateDuration(2).valid).toBe(true);
      expect(validateDuration(4).valid).toBe(true);
      expect(validateDuration(8).valid).toBe(true);
    });
  });
  
  describe('validateBusinessHours', () => {
    it('should reject times before business hours', () => {
      const result = validateBusinessHours('2024-01-15', '06:00', '07:00');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Fuera del horario laboral');
    });
    
    it('should reject times after business hours', () => {
      const result = validateBusinessHours('2024-01-15', '20:30', '22:00');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Fuera del horario laboral');
    });
    
    it('should accept times within weekday business hours', () => {
      // 7 AM debería ser válido ahora
      const result = validateBusinessHours('2024-01-15', '07:00', '09:00');
      expect(result.valid).toBe(true);
    });
    
    it('should use weekend hours for Saturday and Sunday', () => {
      // Saturday - ahora desde 8 AM
      const satResult = validateBusinessHours('2024-01-13', '08:00', '10:00');
      expect(satResult.valid).toBe(true);
      
      // Sunday
      const sunResult = validateBusinessHours('2024-01-14', '08:00', '10:00');
      expect(sunResult.valid).toBe(true);
      
      // Early weekend should fail (antes de 8 AM)
      const earlyResult = validateBusinessHours('2024-01-13', '07:00', '09:00');
      expect(earlyResult.valid).toBe(false);
    });
  });
  
  describe('validateReservationWindow', () => {
    it('should reject reservations in the past', () => {
      // Test usando fecha/hora claramente en el pasado
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().split('T')[0];
      const time = '10:00';
      
      const result = validateReservationWindow(date, time);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('pasado');
    });
    
    it('should reject reservations more than 30 days ahead', () => {
      const future = new Date();
      future.setDate(future.getDate() + 31);
      const date = future.toISOString().split('T')[0];
      const time = '10:00';
      
      const result = validateReservationWindow(date, time);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('30 días');
    });
    
    it('should accept reservations for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const date = future.toISOString().split('T')[0];
      const time = '10:00';
      
      const result = validateReservationWindow(date, time);
      expect(result.valid).toBe(true);
    });
  });
  
  describe('validateLunchBreak', () => {
    it('should warn about overlaps with lunch break', () => {
      const result = validateLunchBreak('12:00', '14:00');
      expect(result.valid).toBe(false);
      expect(result.warning).toBe(true);
      expect(result.reason).toContain('almuerzo');
    });
    
    it('should allow times before lunch', () => {
      const result = validateLunchBreak('10:00', '12:00');
      expect(result.valid).toBe(true);
    });
    
    it('should allow times after lunch', () => {
      const result = validateLunchBreak('14:30', '16:30');
      expect(result.valid).toBe(true);
    });
  });
  
  describe('validateReservation', () => {
    it('should validate all rules and return combined errors', () => {
      // Invalid: too short, outside business hours, too soon
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      const date = inOneHour.toISOString().split('T')[0];
      
      const result = validateReservation(date, '06:00', '06:30', 0.5);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should pass with valid parameters', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const date = future.toISOString().split('T')[0];
      
      const result = validateReservation(date, '10:00', '12:00', 2);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should include warnings without failing validation', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const date = future.toISOString().split('T')[0];
      
      // Overlaps lunch but otherwise valid
      const result = validateReservation(date, '12:00', '14:00', 2);
      
      // Lunch overlap is warning only, should still be valid
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
  
  describe('suggestAlternativeSlots', () => {
    it('should suggest available time slots', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];
      
      const alternatives = suggestAlternativeSlots(date, '10:00', 2, []);
      
      expect(Array.isArray(alternatives)).toBe(true);
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.length).toBeLessThanOrEqual(5);
      
      // Check structure
      alternatives.forEach(alt => {
        expect(alt).toHaveProperty('startTime');
        expect(alt).toHaveProperty('endTime');
        expect(alt).toHaveProperty('durationHours');
        expect(alt).toHaveProperty('recommended');
      });
    });
    
    it('should skip slots that conflict with existing reservations', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];
      
      const existingReservations = [
        { date, startTime: '10:00', endTime: '12:00', status: 'confirmed' },
        { date, startTime: '14:00', endTime: '16:00', status: 'confirmed' }
      ];
      
      const alternatives = suggestAlternativeSlots(date, '10:00', 2, existingReservations);
      
      // Should not suggest 10:00-12:00 or 14:00-16:00
      alternatives.forEach(alt => {
        expect(alt.startTime).not.toBe('10:00');
        expect(alt.startTime).not.toBe('14:00');
      });
    });
    
    it('should mark first 3 alternatives as recommended', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];
      
      const alternatives = suggestAlternativeSlots(date, '10:00', 2, []);
      
      const recommended = alternatives.filter(alt => alt.recommended);
      expect(recommended.length).toBeLessThanOrEqual(3);
    });
  });
  
  describe('formatValidationErrors', () => {
    it('should return null for valid reservations', () => {
      const validation = { valid: true, errors: [], warnings: [], hasWarnings: false };
      const message = formatValidationErrors(validation);
      expect(message).toBeNull();
    });
    
    it('should format errors with suggestions', () => {
      const validation = {
        valid: false,
        errors: [
          { reason: 'Duración mínima: 1 hora', suggestion: 'Reserva al menos 1 hora' }
        ],
        warnings: [],
        hasWarnings: false
      };
      
      const message = formatValidationErrors(validation);
      expect(message).toContain('❌');
      expect(message).toContain('Duración mínima');
      expect(message).toContain('💡');
    });
    
    it('should format warnings separately', () => {
      const validation = {
        valid: true,
        errors: [],
        warnings: [
          { reason: 'Overlap con almuerzo', suggestion: 'Considera otro horario' }
        ],
        hasWarnings: true
      };
      
      const message = formatValidationErrors(validation);
      expect(message).toContain('⚠️');
      expect(message).toContain('almuerzo');
    });
  });
  
  describe('CONFIG constants', () => {
    it('should have all required configuration values', () => {
      expect(CONFIG).toHaveProperty('weekdayStart');
      expect(CONFIG).toHaveProperty('weekdayEnd');
      expect(CONFIG).toHaveProperty('minDurationHours');
      expect(CONFIG).toHaveProperty('maxDurationHours');
      expect(CONFIG).toHaveProperty('minAdvanceHours');
      expect(CONFIG).toHaveProperty('maxAdvanceDays');
      expect(CONFIG).toHaveProperty('lunchBreakStart');
      expect(CONFIG).toHaveProperty('lunchBreakEnd');
    });
    
    it('should have sensible default values', () => {
      expect(CONFIG.minDurationHours).toBe(1);
      expect(CONFIG.maxDurationHours).toBe(8);
      expect(CONFIG.minAdvanceHours).toBe(2);
      expect(CONFIG.maxAdvanceDays).toBe(30);
    });
  });
});
