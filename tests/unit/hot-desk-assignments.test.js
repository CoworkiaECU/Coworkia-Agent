import { describe, test, expect } from '@jest/globals';
import {
  normalizeHotDeskNumbers,
  getHotDeskNumbers,
  formatHotDeskNumbers,
  serializeHotDeskNumbers
} from '../../src/utils/hot-desk-assignments.js';

describe('🪑 Hot Desk Assignments', () => {
  test('normaliza arrays JSON y elimina duplicados', () => {
    const numbers = normalizeHotDeskNumbers('[4,2,2,5]');
    expect(numbers).toEqual([2, 4, 5]);
  });

  test('usa hot_desk_number como fallback si no hay array', () => {
    const numbers = getHotDeskNumbers({ hot_desk_number: 3, hot_desk_numbers: null });
    expect(numbers).toEqual([3]);
  });

  test('formatea múltiples puestos para mensajes al usuario', () => {
    expect(formatHotDeskNumbers([2, 4, 5])).toBe('#2, #4, #5');
  });

  test('serializa asignaciones como JSON estable', () => {
    expect(serializeHotDeskNumbers([5, 2, 5])).toBe('[2,5]');
  });
});
