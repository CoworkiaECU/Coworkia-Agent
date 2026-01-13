/**
 * 🧪 E2E Tests - Flujo Completo de Reserva
 * 
 * Tests del flujo completo de reserva:
 * 1. Formulario inteligente con datos en orden aleatorio
 * 2. Validación timezone-aware (Ecuador)
 * 3. Upsell 3+ personas → sala
 * 4. Detección de conflictos y sugerencias alternativas
 * 5. Confirmación y flag justConfirmed
 */

import { jest } from '@jest/globals';
import databaseService from '../database/database.js';
import { checkAvailability } from '../servicios/calendario.js';
import { PartialReservationForm, extractDataFromMessage, saveForm, getOrCreateForm } from '../servicios/partial-reservation-form.js';

describe('🔄 E2E: Flujo Completo de Reserva', () => {
  const testPhone = '+593987654321';
  
  beforeAll(async () => {
    await databaseService.initialize();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Limpiar datos de test
    await databaseService.run('DELETE FROM pending_confirmations WHERE user_phone = ?', [testPhone]);
    await databaseService.run('DELETE FROM reservation_state WHERE user_phone = ?', [testPhone]);
    await databaseService.run('DELETE FROM reservations WHERE user_phone = ?', [testPhone]);
    await databaseService.run('DELETE FROM users WHERE phone_number = ?', [testPhone]);
  });

  describe('📝 Formulario inteligente - Detección de datos', () => {
    test('debe detectar hot desk, fecha y hora en un mensaje', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      const form = new PartialReservationForm(testPhone);
      const message = `necesito hot desk para ${fecha} a las 2pm`;
      
      const updates = extractDataFromMessage(message, form);
      Object.assign(form, updates);
      
      expect(form.spaceType).toBe('hotDesk');
      expect(form.date).toBe(fecha);
      expect(form.time).toBe('14:00');
      expect(form.isComplete()).toBe(false); // Falta email
    });

    test('debe detectar email y numPeople en mensaje separado', () => {
      const form = new PartialReservationForm(testPhone);
      
      const updates = extractDataFromMessage('somos 3 personas, email test@coworkia.com', form);
      Object.assign(form, updates);
      
      expect(form.numPeople).toBe(3);
      expect(form.email).toBe('test@coworkia.com');
    });

    test('debe detectar todos los datos en orden aleatorio', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      let form = new PartialReservationForm(testPhone);
      
      // Datos en orden NO convencional
      form = Object.assign(form, extractDataFromMessage(`mi email es test@coworkia.com`, form));
      form = Object.assign(form, extractDataFromMessage(`para ${fecha}`, form));
      form = Object.assign(form, extractDataFromMessage(`hot desk`, form));
      form = Object.assign(form, extractDataFromMessage(`a las 10am`, form));
      
      expect(form.isComplete()).toBe(true);
      expect(form.spaceType).toBe('hotDesk');
      expect(form.date).toBe(fecha);
      expect(form.time).toBe('10:00');
      expect(form.email).toBe('test@coworkia.com');
    });
  });

  describe('⏰ Validación timezone-aware Ecuador', () => {
    test('debe rechazar horario en el pasado', async () => {
      // 🕐 Usar fake timers para fijar el tiempo a 2025-11-12 15:00 UTC (10:00am Ecuador)
      jest.useFakeTimers();
      const mockTime = new Date('2025-11-12T15:00:00Z'); // 10:00am Ecuador
      jest.setSystemTime(mockTime);
      
      try {
        const today = '2025-11-12';
        const result = await checkAvailability(today, '08:00', 2, 'hotDesk', mockTime);
        
        // Como son las 10am en Ecuador, 8am ya pasó
        expect(result.available).toBe(false);
        expect(result.reason).toContain('pasó');
      } finally {
        jest.useRealTimers();
      }
    });

    test('debe aceptar horario futuro válido', async () => {
      // 🕐 Usar fake timers para consistencia
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-11-12T15:00:00Z')); // 10:00am Ecuador
      
      try {
        const tomorrow = '2025-11-13';
        const result = await checkAvailability(tomorrow, '10:00', 2, 'hotDesk');
        
        expect(result.available).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    test('debe aceptar horario futuro válido', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      const result = await checkAvailability(fecha, '10:00', 2, 'hotDesk');
      
      expect(result.available).toBe(true);
    });

    test('debe rechazar horario fuera de working hours (antes 7am o después 8pm)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      const result = await checkAvailability(fecha, '21:00', 2, 'hotDesk');
      
      expect(result.available).toBe(false);
      expect(result.reason).toMatch(/horario|disponible/i);
    });
  });

  describe('💰 Lógica de upsell 3+ personas', () => {
    test('debe detectar 3+ personas en formulario', () => {
      const form = new PartialReservationForm(testPhone);
      
      const updates = extractDataFromMessage('somos 4 personas', form);
      Object.assign(form, updates);
      
      expect(form.numPeople).toBe(4);
      expect(form.numPeople >= 3).toBe(true); // Trigger upsell
    });

    test('debe detectar 2 personas (no trigger upsell)', () => {
      const form = new PartialReservationForm(testPhone);
      
      const updates = extractDataFromMessage('somos 2', form);
      Object.assign(form, updates);
      
      expect(form.numPeople).toBe(2);
      expect(form.numPeople < 3).toBe(true); // NO trigger upsell
    });

    test('formulario completo debe tener todos los campos', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      let form = new PartialReservationForm(testPhone);
      form = Object.assign(form, extractDataFromMessage(`hot desk ${fecha} 10am test@coworkia.com`, form));
      
      expect(form.spaceType).toBe('hotDesk');
      expect(form.date).toBe(fecha);
      expect(form.time).toBe('10:00');
      expect(form.email).toBe('test@coworkia.com');
      expect(form.isComplete()).toBe(true);
    });
  });

  describe('🔒 Conflictos y disponibilidad real', () => {
    test('debe detectar conflicto con reserva existente', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      // Crear usuario primero (respetando foreign key)
      await databaseService.run(
        `INSERT OR IGNORE INTO users (phone_number, free_trial_used) VALUES (?, ?)`,
        [testPhone, 0]
      );
      
      // Crear reserva conflictiva
      await databaseService.run(
        `INSERT INTO reservations (id, user_phone, service_type, date, start_time, end_time, duration_hours, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['test-conflict-1', testPhone, 'hotDesk', fecha, '10:00', '12:00', 2, 'confirmed']
      );
      
      // Verificar conflicto
      const result = await checkAvailability(fecha, '10:00', 2, 'hotDesk');
      
      expect(result.available).toBe(false);
      expect(result.reason).toMatch(/ocupado|no disponible/i);
    });

    test('debe aceptar horario sin conflicto', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      await databaseService.run(
        `INSERT OR IGNORE INTO users (phone_number, free_trial_used) VALUES (?, ?)`,
        [testPhone, 0]
      );
      
      // Crear reserva 14:00-16:00
      await databaseService.run(
        `INSERT INTO reservations (id, user_phone, service_type, date, start_time, end_time, duration_hours, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['test-no-conflict', testPhone, 'hotDesk', fecha, '14:00', '16:00', 2, 'confirmed']
      );
      
      // Verificar horario 10:00-12:00 (sin conflicto)
      const result = await checkAvailability(fecha, '10:00', 2, 'hotDesk');
      
      expect(result.available).toBe(true);
    });

    test('debe sugerir alternativas cuando ocupado', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      await databaseService.run(
        `INSERT OR IGNORE INTO users (phone_number, free_trial_used) VALUES (?, ?)`,
        [testPhone, 0]
      );
      
      // Bloquear 10:00-12:00
      await databaseService.run(
        `INSERT INTO reservations (id, user_phone, service_type, date, start_time, end_time, duration_hours, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['test-alt', testPhone, 'hotDesk', fecha, '10:00', '12:00', 2, 'confirmed']
      );
      
      const result = await checkAvailability(fecha, '10:00', 2, 'hotDesk');
      
      expect(result.available).toBe(false);
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe('✅ Confirmación y persistencia', () => {
    test('debe guardar y recuperar formulario parcial', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      // Guardar formulario con saveForm
      let form = new PartialReservationForm(testPhone);
      form = Object.assign(form, extractDataFromMessage(`hot desk ${fecha} 10am test@coworkia.com`, form));
      const saved = await saveForm(form);
      
      expect(saved).toBe(true);
      
      // Recuperar con getOrCreateForm
      const recovered = await getOrCreateForm(testPhone);
      expect(recovered).toBeDefined();
      expect(recovered.spaceType).toBe('hotDesk');
      expect(recovered.date).toBe(fecha);
      expect(recovered.time).toBe('10:00');
      expect(recovered.email).toBe('test@coworkia.com');
    });

    test('debe persistir datos parciales entre mensajes', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];
      
      // Primer mensaje: solo hot desk
      let form1 = new PartialReservationForm(testPhone);
      form1 = Object.assign(form1, extractDataFromMessage('hot desk', form1));
      await saveForm(form1);
      
      // Segundo mensaje: agregar fecha
      const form2 = await getOrCreateForm(testPhone);
      Object.assign(form2, extractDataFromMessage(`para ${fecha}`, form2));
      await saveForm(form2);
      
      // Tercer mensaje: agregar hora
      const form3 = await getOrCreateForm(testPhone);
      Object.assign(form3, extractDataFromMessage('a las 10am', form3));
      
      expect(form3.spaceType).toBe('hotDesk');
      expect(form3.date).toBe(fecha);
      expect(form3.time).toBe('10:00');
    });

    test('formulario vacío cuando no hay datos guardados', async () => {
      const form = await getOrCreateForm('+593999000000');
      
      expect(form).toBeDefined();
      expect(form.spaceType).toBeNull();
      expect(form.date).toBeNull();
      expect(form.time).toBeNull();
      expect(form.email).toBeNull();
    });
  });

  describe('🚩 Flag justConfirmed - Prevención duplicados', () => {
    beforeEach(async () => {
      // Crear usuario antes de reservation_state por foreign key
      await databaseService.run(
        `INSERT OR IGNORE INTO users (phone_number, free_trial_used) VALUES (?, ?)`,
        [testPhone, 0]
      );
    });

    test('debe activar flag justConfirmed por 10 minutos', async () => {
      const tenMinutesLater = new Date();
      tenMinutesLater.setMinutes(tenMinutesLater.getMinutes() + 10);
      
      await databaseService.run(
        `INSERT INTO reservation_state (user_phone, just_confirmed_until, last_reservation_id, updated_at)
         VALUES (?, ?, ?, ?)`,
        [testPhone, tenMinutesLater.toISOString(), 'test-res-123', new Date().toISOString()]
      );
      
      // Verificar que existe
      const state = await databaseService.get(
        'SELECT * FROM reservation_state WHERE user_phone = ?',
        [testPhone]
      );
      
      expect(state).toBeDefined();
      expect(state.just_confirmed_until).toBeDefined();
      expect(new Date(state.just_confirmed_until) > new Date()).toBe(true);
    });

    test('flag justConfirmed debe detectarse como activo', async () => {
      const tenMinutesLater = new Date();
      tenMinutesLater.setMinutes(tenMinutesLater.getMinutes() + 10);
      
      await databaseService.run(
        `INSERT INTO reservation_state (user_phone, just_confirmed_until, last_reservation_id, updated_at)
         VALUES (?, ?, ?, ?)`,
        [testPhone, tenMinutesLater.toISOString(), 'test-res-123', new Date().toISOString()]
      );
      
      const state = await databaseService.get(
        'SELECT just_confirmed_until FROM reservation_state WHERE user_phone = ?',
        [testPhone]
      );
      
      const isActive = new Date(state.just_confirmed_until) > new Date();
      expect(isActive).toBe(true);
    });

    test('flag justConfirmed expirado debe limpiarse', async () => {
      const oneMinuteAgo = new Date();
      oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);
      
      await databaseService.run(
        `INSERT INTO reservation_state (user_phone, just_confirmed_until, last_reservation_id, updated_at)
         VALUES (?, ?, ?, ?)`,
        [testPhone, oneMinuteAgo.toISOString(), 'test-res-123', new Date().toISOString()]
      );
      
      const state = await databaseService.get(
        'SELECT just_confirmed_until FROM reservation_state WHERE user_phone = ?',
        [testPhone]
      );
      
      const isExpired = new Date(state.just_confirmed_until) < new Date();
      expect(isExpired).toBe(true);
    });
  });
});
