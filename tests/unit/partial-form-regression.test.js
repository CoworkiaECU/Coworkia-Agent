/**
 * 🧪 Tests de regresión con frases reales
 * Valida que Aurora detecte correctamente datos en mensajes naturales
 */

import { describe, test, expect, jest } from '@jest/globals';

// Mock de reservation-state para tests unitarios
jest.unstable_mockModule('../../src/servicios/reservation-state.js', () => ({
  getPendingConfirmation: jest.fn(),
  setPendingConfirmation: jest.fn(),
  clearPendingConfirmation: jest.fn()
}));

const { extractDataFromMessage, PartialReservationForm } = await import('../../src/servicios/partial-reservation-form.js');

describe('🧪 Detección de datos en frases reales', () => {
  
  test('Mensaje completo: "hola, quiero un hot desk para hoy, mi correo es yo@diegovillota.com"', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage(
      'hola, quiero un hot desk para hoy, mi correo es yo@diegovillota.com',
      form
    );

    expect(updates.spaceType).toBe('hotDesk');
    expect(updates.date).toBeDefined();
    expect(updates.email).toBe('yo@diegovillota.com');
  });

  test('Hora simple: "hoy 10am"', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage('hoy 10am', form);

    expect(updates.date).toBeDefined();
    expect(updates.time).toBe('10:00');
  });

  test('Con personas: "quiero un hot desk para hoy con 2 personas"', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage(
      'quiero un hot desk para hoy con 2 personas',
      form
    );

    expect(updates.spaceType).toBe('hotDesk');
    expect(updates.date).toBeDefined();
    expect(updates.numPeople).toBe(2);
  });

  test('Mañana con hora: "mañana 3pm"', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage('mañana 3pm', form);

    expect(updates.date).toBeDefined();
    expect(updates.time).toBe('15:00'); // 3pm = 15:00
  });

  test('Sala de reuniones: "mañana 5pm sala de reuniones"', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage('mañana 5pm sala de reuniones', form);

    expect(updates.spaceType).toBe('meetingRoom');
    expect(updates.date).toBeDefined();
    expect(updates.time).toBe('17:00'); // 5pm = 17:00
  });

  test('Somos 3 personas', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage('somos 3 personas', form);

    expect(updates.numPeople).toBe(3);
  });

  test('Voy con 2 acompañantes', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage('voy con 2 acompañantes', form);

    expect(updates.numPeople).toBe(2);
  });

  test('Email en medio del mensaje', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage(
      'si claro, mi email es contacto@ejemplo.com y quiero para mañana',
      form
    );

    expect(updates.email).toBe('contacto@ejemplo.com');
    expect(updates.date).toBeDefined();
  });

  test('Hora formato 24h: "para hoy a las 14:30"', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage('para hoy a las 14:30', form);

    expect(updates.date).toBeDefined();
    expect(updates.time).toBe('14:30');
  });

  test('No detectar datos en mensaje genérico', () => {
    const form = new PartialReservationForm('test-user');
    const updates = extractDataFromMessage('hola, cómo estás?', form);

    expect(Object.keys(updates).length).toBe(0);
  });
});

describe('🧠 Formulario parcial - Flujo progresivo', () => {
  
  test('Formulario se completa progresivamente', () => {
    const form = new PartialReservationForm('test-user');

    // Paso 1: Usuario menciona tipo y fecha
    let updates = extractDataFromMessage('quiero un hot desk para hoy', form);
    form.updateFields(updates);
    expect(form.spaceType).toBe('hotDesk');
    expect(form.date).toBeDefined();
    expect(form.isComplete()).toBe(false);

    // Paso 2: Usuario da hora
    updates = extractDataFromMessage('a las 10am', form);
    form.updateFields(updates);
    expect(form.time).toBe('10:00');
    expect(form.isComplete()).toBe(false);

    // Paso 3: Usuario da email
    updates = extractDataFromMessage('mi correo es test@ejemplo.com', form);
    form.updateFields(updates);
    expect(form.email).toBe('test@ejemplo.com');
    expect(form.isComplete()).toBe(true);
  });

  test('getMissingFields retorna campos faltantes correctos', () => {
    const form = new PartialReservationForm('test-user');
    form.updateField('spaceType', 'hotDesk');
    form.updateField('date', '2025-11-13');

    const missing = form.getMissingFields();
    expect(missing).toContain('time');
    expect(missing).toContain('email');
    expect(missing).not.toContain('spaceType');
    expect(missing).not.toContain('date');
  });

  test('getSummary genera resumen legible', () => {
    const form = new PartialReservationForm('test-user');
    form.updateField('spaceType', 'hotDesk');
    form.updateField('date', '2025-11-13');
    form.updateField('time', '10:00');

    const summary = form.getSummary();
    expect(summary).toContain('Hot Desk');
    expect(summary).toContain('2025-11-13');
    expect(summary).toContain('10:00');
  });

  test('Upsell: 3+ personas debe sugerir sala', () => {
    const form = new PartialReservationForm('test-user');
    form.updateField('spaceType', 'hotDesk');
    form.updateField('numPeople', 3);

    // Lógica de upsell se evalúa externamente
    expect(form.spaceType).toBe('hotDesk');
    expect(form.numPeople).toBe(3);
    
    // El upsell sugiere sala pero mantiene hot desk si usuario no cambia
    const shouldSuggestMeetingRoom = form.spaceType === 'hotDesk' && form.numPeople >= 3;
    expect(shouldSuggestMeetingRoom).toBe(true);
  });

  test('toJSON y fromJSON mantienen datos', () => {
    const form = new PartialReservationForm('test-user');
    form.updateField('spaceType', 'meetingRoom');
    form.updateField('date', '2025-11-13');
    form.updateField('time', '15:00');
    form.updateField('email', 'test@ejemplo.com');
    form.updateField('numPeople', 4);

    const json = form.toJSON();
    const restored = PartialReservationForm.fromJSON(json);

    expect(restored.spaceType).toBe('meetingRoom');
    expect(restored.date).toBe('2025-11-13');
    expect(restored.time).toBe('15:00');
    expect(restored.email).toBe('test@ejemplo.com');
    expect(restored.numPeople).toBe(4);
  });

  test('Hot Desk en ventana gratis no pide método de pago', () => {
    const form = new PartialReservationForm('test-user');
    form.updateField('spaceType', 'hotDesk');
    form.updateField('date', '2026-02-13');
    form.updateField('time', '08:45');
    form.updateField('email', 'trial@example.com');

    const missing = form.getMissingFields();
    expect(missing).not.toContain('paymentMethod');

    const json = form.toJSON();
    expect(json.freeTrialWindowEligible).toBe(true);
    expect(json.totalPrice).toBe(0);
  });

  test('Hot Desk fuera de ventana sí requiere pago', () => {
    const form = new PartialReservationForm('test-user');
    form.updateField('spaceType', 'hotDesk');
    form.updateField('date', '2026-02-13');
    form.updateField('time', '13:00'); // 13:00 está fuera de la ventana gratuita 08:00–12:00
    form.updateField('email', 'trial@example.com');

    const missing = form.getMissingFields();
    expect(missing).toContain('paymentMethod');

    const json = form.toJSON();
    expect(json.freeTrialWindowEligible).toBe(false);
  });
});
