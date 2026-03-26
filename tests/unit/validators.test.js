/**
 * Tests para validators.js
 * Auditoría duplicados TODO #46
 */

import { describe, test, expect } from '@jest/globals';
import {
  normalizePhone,
  validatePhone,
  phonesMatch,
  isAdminPhone,
  validatePlate,
  validateForeignPlate,
  formatPrice,
  parseAmount,
  validateAmount,
  validateCode,
  generateCode
} from '../../src/utils/validators.js';

describe('Phone Validators', () => {
  describe('normalizePhone', () => {
    test('elimina caracteres no numéricos', () => {
      expect(normalizePhone('+593 99 999 9999')).toBe('593999999999');
      expect(normalizePhone('(593) 99-999-9999')).toBe('593999999999');
      expect(normalizePhone('593.999.999.999')).toBe('593999999999');
    });
    
    test('maneja strings y números', () => {
      expect(normalizePhone('593999999999')).toBe('593999999999');
      expect(normalizePhone(593999999999)).toBe('593999999999');
    });
    
    test('retorna string vacío si input vacío', () => {
      expect(normalizePhone('')).toBe('');
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
    });
  });
  
  describe('validatePhone', () => {
    test('acepta formato Ecuador válido', () => {
      expect(validatePhone('593999999999')).toBe('+593999999999');
      expect(validatePhone('+593999999999')).toBe('+593999999999');
      expect(validatePhone('593 99 999 9999')).toBe('+593999999999');
    });
    
    test('rechaza formato sin código Ecuador', () => {
      expect(() => validatePhone('999999999')).toThrow('debe iniciar con código Ecuador');
    });
    
    test('rechaza longitud inválida', () => {
      expect(() => validatePhone('593999')).toThrow('debe tener 10-12 dígitos');
      expect(() => validatePhone('5939999999999999')).toThrow('debe tener 10-12 dígitos');
    });
    
    test('rechaza input vacío', () => {
      expect(() => validatePhone('')).toThrow('Teléfono requerido');
      expect(() => validatePhone(null)).toThrow('Teléfono requerido');
    });
  });
  
  describe('phonesMatch', () => {
    test('compara teléfonos ignorando formato', () => {
      expect(phonesMatch('+593999999999', '593 99 999 9999')).toBe(true);
      expect(phonesMatch('(593) 999-999-999', '+593999999999')).toBe(true);
    });
    
    test('detecta teléfonos diferentes', () => {
      expect(phonesMatch('593999999999', '593888888888')).toBe(false);
    });
    
    test('maneja inputs vacíos', () => {
      expect(phonesMatch('', '593999999999')).toBe(false);
      expect(phonesMatch(null, '593999999999')).toBe(false);
      expect(phonesMatch('593999999999', null)).toBe(false);
    });
  });
  
  describe('isAdminPhone', () => {
    test('detecta teléfono admin', () => {
      expect(isAdminPhone('593999999999', '593999999999')).toBe(true);
      expect(isAdminPhone('+593 99 999 9999', '593999999999')).toBe(true);
    });
    
    test('detecta teléfono no admin', () => {
      expect(isAdminPhone('593888888888', '593999999999')).toBe(false);
    });
    
    test('retorna false si adminPhone no definido', () => {
      expect(isAdminPhone('593999999999', null)).toBe(false);
      expect(isAdminPhone('593999999999', '')).toBe(false);
    });
  });
});

describe('Plate Validators', () => {
  describe('validatePlate', () => {
    test('valida placas Ecuador formato correcto', () => {
      expect(validatePlate('ABC-1234')).toBe('ABC-1234');
      expect(validatePlate('ABC1234')).toBe('ABC-1234');
      expect(validatePlate('abc-1234')).toBe('ABC-1234');
      expect(validatePlate('AB-1234')).toBe('AB-1234');
    });
    
    test('rechaza formato inválido', () => {
      expect(() => validatePlate('A-1234')).toThrow();
      expect(() => validatePlate('ABCD-1234')).toThrow();
      expect(() => validatePlate('ABC-12')).toThrow();
    });
    
    test('rechaza input vacío', () => {
      expect(() => validatePlate('')).toThrow('Placa requerida');
      expect(() => validatePlate(null)).toThrow('Placa requerida');
    });
  });
  
  describe('validateForeignPlate', () => {
    test('acepta placas extranjeras variadas', () => {
      expect(validateForeignPlate('ABC-123-DE')).toBe('ABC-123-DE');
      expect(validateForeignPlate('1234ABC')).toBe('1234ABC');
      expect(validateForeignPlate('FL 1234')).toBe('FL 1234');
    });
    
    test('rechaza placas muy cortas', () => {
      expect(() => validateForeignPlate('AB1')).toThrow('al menos 5 caracteres');
    });
    
    test('rechaza caracteres especiales', () => {
      expect(() => validateForeignPlate('ABC@1234')).toThrow('letras/números');
    });
  });
});

describe('Currency Utilities', () => {
  describe('formatPrice', () => {
    test('formatea montos correctamente', () => {
      expect(formatPrice(1234.56)).toBe('$1,234.56');
      expect(formatPrice(100)).toBe('$100.00');
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(1000000)).toBe('$1,000,000.00');
    });
    
    test('maneja decimales custom', () => {
      expect(formatPrice(1234.567, 3)).toBe('$1,234.567');
      expect(formatPrice(100, 0)).toBe('$100');
    });
    
    test('maneja inputs inválidos', () => {
      expect(formatPrice(null)).toBe('$0.00');
      expect(formatPrice(undefined)).toBe('$0.00');
      expect(formatPrice(NaN)).toBe('$0.00');
    });
  });
  
  describe('parseAmount', () => {
    test('parsea formato americano', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
      expect(parseAmount('$1,234.56')).toBe(1234.56);
      expect(parseAmount('100')).toBe(100);
    });
    
    test('parsea formato europeo', () => {
      expect(parseAmount('1.234,56')).toBe(1234.56);
      expect(parseAmount('1234,56')).toBe(1234.56);
    });
    
    test('maneja input sin formato', () => {
      expect(parseAmount('1234.56')).toBe(1234.56);
      expect(parseAmount('100')).toBe(100);
    });
    
    test('rechaza input inválido', () => {
      expect(() => parseAmount('abc')).toThrow('Monto inválido');
      expect(() => parseAmount('12.34.56')).toThrow('Monto inválido');
    });
    
    test('retorna 0 para input vacío', () => {
      expect(parseAmount('')).toBe(0);
      expect(parseAmount(null)).toBe(0);
    });
  });
  
  describe('validateAmount', () => {
    test('valida montos en rango', () => {
      expect(validateAmount(100, 0, 200)).toBe(100);
      expect(validateAmount('50.50', 0, 100)).toBe(50.50);
    });
    
    test('rechaza montos fuera de rango', () => {
      expect(() => validateAmount(-10, 0)).toThrow('mayor o igual');
      expect(() => validateAmount(150, 0, 100)).toThrow('menor o igual');
    });
    
    test('valida sin máximo', () => {
      expect(validateAmount(1000000, 0)).toBe(1000000);
    });
  });
});

describe('Code Utilities', () => {
  describe('validateCode', () => {
    test('valida códigos formato correcto', () => {
      expect(validateCode('ENZO-2026-001')).toBe('ENZO-2026-001');
      expect(validateCode('adriana-2026-abc123')).toBe('ADRIANA-2026-ABC123');
    });
    
    test('valida prefijo específico', () => {
      expect(validateCode('ENZO-2026-001', 'ENZO')).toBe('ENZO-2026-001');
      expect(() => validateCode('ADRIANA-2026-001', 'ENZO')).toThrow('debe iniciar con ENZO');
    });
    
    test('rechaza formato inválido', () => {
      expect(() => validateCode('ENZO2026001')).toThrow('formato AGENTE-2026-001');
      expect(() => validateCode('ENZO-26-001')).toThrow('formato AGENTE-2026-001');
    });
  });
  
  describe('generateCode', () => {
    test('genera código formato correcto', () => {
      const code = generateCode('ENZO', 1);
      expect(code).toMatch(/^ENZO-\d{4}-001$/);
    });
    
    test('pad sequence con ceros', () => {
      expect(generateCode('ADRIANA', 5)).toContain('-005');
      expect(generateCode('AXEL', 123)).toContain('-123');
    });
    
    test('normaliza prefijo a mayúsculas', () => {
      expect(generateCode('enzo', 1)).toMatch(/^ENZO-/);
    });
  });
});
