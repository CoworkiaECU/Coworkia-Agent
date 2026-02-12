import { describe, test, expect } from '@jest/globals';
import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';

describe('🧠 Detección de intenciones', () => {
  test('link de confirmación activa modo soporte post-email', () => {
    const mensaje = 'Recibí tu correo y tengo dudas';
    const intencion = detectarIntencion(mensaje);

    expect(intencion.agent).toBe('AURORA');
    expect(intencion.reason).toBe('post-email support link');
    expect(intencion.flags?.postEmailSupport).toBe(true);
  });
});
