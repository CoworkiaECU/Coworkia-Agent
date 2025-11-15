/**
 * Tests para verificar flujo de cancelación
 */

import { detectarCancelacion } from '../deteccion-intenciones/detectar-intencion.js';

describe('Detección de cancelación', () => {
  test('detecta "cancela" simple', () => {
    expect(detectarCancelacion('cancela')).toBe(true);
  });

  test('detecta "cancelar reserva"', () => {
    expect(detectarCancelacion('cancelar reserva')).toBe(true);
  });

  test('detecta "ya no quiero"', () => {
    expect(detectarCancelacion('ya no quiero')).toBe(true);
  });

  test('detecta "mejor no"', () => {
    expect(detectarCancelacion('mejor no')).toBe(true);
  });

  test('detecta "olvídalo" con tilde', () => {
    expect(detectarCancelacion('olvídalo')).toBe(true);
  });

  test('detecta "dejalo" sin tilde', () => {
    expect(detectarCancelacion('dejalo')).toBe(true);
  });

  test('detecta "no importa"', () => {
    expect(detectarCancelacion('no importa')).toBe(true);
  });

  test('detecta "cambié de opinión"', () => {
    expect(detectarCancelacion('cambié de opinión')).toBe(true);
  });

  test('detecta "no por ahora"', () => {
    expect(detectarCancelacion('no por ahora')).toBe(true);
  });

  test('NO detecta mensaje normal', () => {
    expect(detectarCancelacion('hola quiero reservar')).toBe(false);
  });

  test('NO detecta pregunta sobre cancelación', () => {
    expect(detectarCancelacion('puedo cancelar después?')).toBe(false);
  });

  test('detecta con mayúsculas y tildes', () => {
    expect(detectarCancelacion('CANCELA LA RESERVA')).toBe(true);
  });
});
