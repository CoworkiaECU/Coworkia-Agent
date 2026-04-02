/**
 * 🏡 Tests unitarios para el flujo de agendamiento de visitas de Paula
 * Verifica: detección de tags, extracción de datos, resolución de direcciones, regex de horarios
 */

import { describe, test, expect, jest, beforeAll } from '@jest/globals';

// Mock databaseService ANTES de imports
jest.unstable_mockModule('../../src/database/database.js', () => ({
  default: {
    initialize: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    run: jest.fn().mockResolvedValue({ changes: 1 }),
    all: jest.fn().mockResolvedValue([]),
  }
}));

// Mock memoria-sqlite (savePendingConfirmation)
jest.unstable_mockModule('../../src/perfiles-interacciones/memoria-sqlite.js', () => ({
  savePendingConfirmation: jest.fn().mockResolvedValue(true),
  getPendingConfirmation: jest.fn(),
  clearPendingConfirmation: jest.fn().mockResolvedValue(true),
}));

// Mock paula-visit-scheduler
jest.unstable_mockModule('../../src/servicios/paula-visit-scheduler.js', () => ({
  schedulePropertyVisit: jest.fn().mockResolvedValue({ success: true }),
  suggestVisitTimes: jest.fn().mockResolvedValue([]),
  checkVisitAvailability: jest.fn().mockResolvedValue({ available: true }),
}));

let shouldActivateVisitConfirmation, extractVisitData;

beforeAll(async () => {
  const mod = await import('../../src/servicios/paula-confirmation-helper.js');
  shouldActivateVisitConfirmation = mod.shouldActivateVisitConfirmation;
  extractVisitData = mod.extractVisitData;
});

// ─── shouldActivateVisitConfirmation ─────────────────────────────────────────

describe('shouldActivateVisitConfirmation', () => {
  test('detecta tag [CONFIRMAR_VISITA]', () => {
    expect(shouldActivateVisitConfirmation('Aquí tienes los horarios [CONFIRMAR_VISITA]')).toBe(true);
  });

  test('detecta "agendar visita"', () => {
    expect(shouldActivateVisitConfirmation('¿Te gustaría agendar visita?')).toBe(true);
  });

  test('detecta "coordinar visita"', () => {
    expect(shouldActivateVisitConfirmation('Podemos coordinar visita esta semana')).toBe(true);
  });

  test('detecta "quieres ver esta propiedad"', () => {
    expect(shouldActivateVisitConfirmation('¿Quieres ver esta propiedad?')).toBe(true);
  });

  test('NO activa con mensaje genérico', () => {
    expect(shouldActivateVisitConfirmation('El precio es $340,000 USD')).toBe(false);
  });
});

// ─── extractVisitData ────────────────────────────────────────────────────────

describe('extractVisitData', () => {
  const mockProfile = { 
    userId: '593999000111', 
    name: 'Juan Test',
    email: 'juan@test.com',
    phone_number: '593999000111'
  };

  test('extrae propiedad ECU-JARDIN-6 con horario 3pm', () => {
    const msg = `¡Perfecto! Agendemos tu visita a **Casa Jardín #6** 📅

Horarios disponibles:
• Miércoles 3/4 a las 10:00 AM
• Jueves 4/4 a las 3:00 PM

¿Cuál te viene mejor? [CONFIRMAR_VISITA]
Código: ECU-JARDIN-6
Propiedad: Casa Jardín #6
Dirección: Urbanización El Morenal, Cumbayá`;

    const result = extractVisitData(msg, mockProfile);
    
    expect(result).not.toBeNull();
    expect(result.propertyCode).toBe('ECU-JARDIN-6');
    expect(result.propertyName).toBe('Casa Jardín #6');
    expect(result.propertyAddress).toContain('Morenal');
    expect(result.propertyAddress).not.toBe('Por confirmar');
    expect(result.clientName).toBe('Juan Test');
    expect(result.startTime).toBe('10:00');
  });

  test('resuelve dirección desde catálogo si no viene en mensaje', () => {
    const msg = `¡Agendemos tu visita a **Casa Jardín #1**!

📅 Mañana a las 10am
[CONFIRMAR_VISITA]
Código: ECU-JARDIN-1`;

    const result = extractVisitData(msg, mockProfile);
    
    expect(result).not.toBeNull();
    expect(result.propertyCode).toBe('ECU-JARDIN-1');
    expect(result.propertyAddress).toBe('Urbanización El Morenal, Casa Jardín #1, Cumbayá, Quito');
  });

  test('NO retorna null si falta horario (usa 10:00 default)', () => {
    const msg = `¿Te gustaría visitar **Casa Jardín #7** mañana?
[CONFIRMAR_VISITA]
Código: ECU-JARDIN-7`;

    const result = extractVisitData(msg, mockProfile);
    
    expect(result).not.toBeNull();
    expect(result.startTime).toBe('10:00');
    expect(result.propertyAddress).toContain('Morenal');
  });

  test('parsea "3 de la tarde" correctamente', () => {
    const msg = `Visita a **Casa Jardín #3** el jueves a las 3 de la tarde
[CONFIRMAR_VISITA]
Código: ECU-JARDIN-3`;

    const result = extractVisitData(msg, mockProfile);
    
    expect(result).not.toBeNull();
    // El regex captura "3 de la tarde" → se transforma a "3pm" → normaliza a "15:00"
    expect(result.startTime).toBe('15:00');
  });

  test('parsea "a las 10" (sin am/pm)', () => {
    const msg = `Te espero mañana a las 10 en la propiedad
[CONFIRMAR_VISITA]
Código: ECU-JARDIN-6`;

    const result = extractVisitData(msg, mockProfile);
    
    expect(result).not.toBeNull();
    expect(result.startTime).toBe('10:00');
  });

  test('dirección explícita en mensaje tiene prioridad', () => {
    const msg = `Visita agendada:
📍 Dirección: Av. Interoceánica Km 14, Cumbayá
10am mañana
[CONFIRMAR_VISITA]
Código: ECU-JARDIN-1`;

    const result = extractVisitData(msg, mockProfile);
    
    expect(result).not.toBeNull();
    expect(result.propertyAddress).toBe('Av. Interoceánica Km 14, Cumbayá');
  });

  test('sin código de propiedad usa dirección default', () => {
    const msg = `¿Te gustaría visitar la propiedad mañana a las 3pm?
[CONFIRMAR_VISITA]`;

    const result = extractVisitData(msg, mockProfile);
    
    expect(result).not.toBeNull();
    expect(result.propertyAddress).toBe('Urbanización El Morenal, Cumbayá, Quito');
  });
});
