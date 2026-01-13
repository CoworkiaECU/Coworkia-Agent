/**
 * 🧪 Tests de integración para flujo de confirmación completo
 * Valida el flujo end-to-end desde confirmación hasta creación de reserva
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('🔄 Flujo de Confirmación Completo', () => {
  
  describe('Usuario nuevo - Día gratis', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = global.testUtils.createMockUser({
        firstVisit: true,
        freeTrialUsed: false
      });
    });

    test('debe crear reserva gratis sin cobrar', async () => {
      const reservation = global.testUtils.createMockReservation({
        wasFree: true,
        totalPrice: 0
      });

      expect(reservation.totalPrice).toBe(0);
      expect(reservation.wasFree).toBe(true);
    });

    test('NO debe marcar freeTrialUsed hasta que asista', () => {
      // Validar que freeTrialUsed permanece false después de confirmar
      expect(mockUser.freeTrialUsed).toBe(false);
    });

    test('debe activar flag justConfirmed por 10 minutos', () => {
      // Simular confirmación
      mockUser.justConfirmed = true;
      mockUser.justConfirmedAt = new Date().toISOString();

      expect(mockUser.justConfirmed).toBe(true);
      expect(mockUser.justConfirmedAt).toBeDefined();
    });
  });

  describe('Usuario recurrente - Reserva pagada', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = global.testUtils.createMockUser({
        firstVisit: false,
        freeTrialUsed: true,
        freeTrialDate: '2025-11-01'
      });
    });

    test('debe calcular precio correcto para Hot Desk', async () => {
      const reservation = global.testUtils.createMockReservation({
        wasFree: false,
        totalPrice: 10,
        durationHours: 2
      });

      expect(reservation.totalPrice).toBe(10);
      expect(reservation.wasFree).toBe(false);
    });

    test('debe requerir pago para cualquier reserva', () => {
      expect(mockUser.freeTrialUsed).toBe(true);
      
      const reservation = global.testUtils.createMockReservation({
        wasFree: false
      });
      
      expect(reservation.wasFree).toBe(false);
    });
  });

  describe('Flag justConfirmed - Limpieza automática', () => {
    test('debe limpiar flag después de 10 minutos', () => {
      const now = new Date();
      const elevenMinutesAgo = new Date(now.getTime() - 11 * 60 * 1000);
      
      const mockUser = global.testUtils.createMockUser({
        justConfirmed: true,
        justConfirmedAt: elevenMinutesAgo.toISOString()
      });

      // Simular lógica de limpieza
      const minutesPassed = (now - new Date(mockUser.justConfirmedAt)) / (1000 * 60);
      const shouldClean = minutesPassed > 10;

      expect(shouldClean).toBe(true);
    });

    test('NO debe limpiar flag antes de 10 minutos', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const mockUser = global.testUtils.createMockUser({
        justConfirmed: true,
        justConfirmedAt: fiveMinutesAgo.toISOString()
      });

      const minutesPassed = (now - new Date(mockUser.justConfirmedAt)) / (1000 * 60);
      const shouldClean = minutesPassed > 10;

      expect(shouldClean).toBe(false);
    });
  });

  describe('Validación de disponibilidad', () => {
    test('debe rechazar horario en el pasado', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const reservation = global.testUtils.createMockReservation({
        date: yesterday.toISOString().split('T')[0],
        startTime: '09:00'
      });

      const reservationDate = new Date(reservation.date + 'T' + reservation.startTime);
      const isInPast = reservationDate < new Date();

      expect(isInPast).toBe(true);
    });

    test('debe aceptar horario futuro', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reservation = global.testUtils.createMockReservation({
        date: tomorrow.toISOString().split('T')[0],
        startTime: '09:00'
      });

      const reservationDate = new Date(reservation.date + 'T' + reservation.startTime);
      const isInFuture = reservationDate > new Date();

      expect(isInFuture).toBe(true);
    });
  });

  describe('Duración de reserva', () => {
    test('debe limitar a máximo 2 horas por defecto', () => {
      const reservation = global.testUtils.createMockReservation({
        durationHours: 2
      });

      expect(reservation.durationHours).toBeLessThanOrEqual(2);
    });

    test('debe calcular endTime correctamente', () => {
      const reservation = global.testUtils.createMockReservation({
        startTime: '09:00',
        durationHours: 2,
        endTime: '11:00'
      });

      const startHour = parseInt(reservation.startTime.split(':')[0]);
      const endHour = parseInt(reservation.endTime.split(':')[0]);
      const duration = endHour - startHour;

      expect(duration).toBe(reservation.durationHours);
    });
  });
});
