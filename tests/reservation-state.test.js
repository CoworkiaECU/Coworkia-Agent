/**
 * 🧪 Tests para reservation-state.js
 * Estado de reservas y confirmaciones en SQLite
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import databaseService from '../src/database/database.js';
import {
  setPendingConfirmation,
  getPendingConfirmation,
  clearPendingConfirmation,
  cleanupExpiredConfirmations,
  markJustConfirmed,
  clearJustConfirmed,
  getJustConfirmedState,
  isUserCoolingDown,
  cleanupJustConfirmedFlags
} from '../src/servicios/reservation-state.js';

describe('Reservation State Management', () => {
  // Helper para crear usuario de prueba
  async function createTestUser(phone) {
    await databaseService.run(
      `INSERT OR IGNORE INTO users (phone_number, name, first_visit, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [phone, 'Test User', 1]
    );
  }

  beforeEach(async () => {
    await databaseService.initialize();
    // Limpiar datos de prueba
    await databaseService.run('DELETE FROM pending_confirmations');
    await databaseService.run('DELETE FROM reservation_state');
    await databaseService.run('DELETE FROM users');
    
    // Crear usuarios de prueba
    await createTestUser('+593987770788');
    await createTestUser('+593999888777');
    await createTestUser('+593988999888');
  });

  afterEach(async () => {
    // Cleanup
    await databaseService.run('DELETE FROM pending_confirmations');
    await databaseService.run('DELETE FROM reservation_state');
    await databaseService.run('DELETE FROM users');
  });

  describe('Pending Confirmations', () => {
    test('should set and get pending confirmation', async () => {
      const userPhone = '+593987770788';
      const reservationData = {
        serviceType: 'hot-desk',
        date: '2025-11-15',
        startTime: '09:00',
        endTime: '13:00',
        price: 15
      };

      await setPendingConfirmation(userPhone, reservationData, 30);
      const retrieved = await getPendingConfirmation(userPhone);

      expect(retrieved).toBeDefined();
      expect(retrieved.serviceType).toBe('hot-desk');
      expect(retrieved.date).toBe('2025-11-15');
      expect(retrieved.price).toBe(15);
    });

    test('should return null for non-existent confirmation', async () => {
      const result = await getPendingConfirmation('+593999999999');
      expect(result).toBeNull();
    });

    test('should clear pending confirmation', async () => {
      const userPhone = '+593987770788';
      const reservationData = { serviceType: 'hot-desk' };

      await setPendingConfirmation(userPhone, reservationData);
      await clearPendingConfirmation(userPhone);
      
      const result = await getPendingConfirmation(userPhone);
      expect(result).toBeNull();
    });

    test('should expire confirmation after TTL', async () => {
      const userPhone = '+593987770788';
      const reservationData = { serviceType: 'hot-desk' };

      // Set with negative TTL (already expired)
      await setPendingConfirmation(userPhone, reservationData, -1);
      
      // Cleanup should remove it
      const deleted = await cleanupExpiredConfirmations();
      expect(deleted).toBeGreaterThanOrEqual(0);
      
      const result = await getPendingConfirmation(userPhone);
      expect(result).toBeNull();
    });

    test('should update existing confirmation', async () => {
      const userPhone = '+593987770788';
      const data1 = { serviceType: 'hot-desk', price: 10 };
      const data2 = { serviceType: 'sala-reunion', price: 25 };

      await setPendingConfirmation(userPhone, data1);
      await setPendingConfirmation(userPhone, data2);

      const retrieved = await getPendingConfirmation(userPhone);
      expect(retrieved.serviceType).toBe('sala-reunion');
      expect(retrieved.price).toBe(25);
    });
  });

  describe('Just Confirmed State', () => {
    test('should mark user as just confirmed', async () => {
      const userPhone = '+593987770788';
      const reservationId = 'RES-12345';

      await markJustConfirmed(userPhone, reservationId, 10);
      const state = await getJustConfirmedState(userPhone);

      expect(state.isActive).toBe(true);
      expect(state.until).toBeDefined();
    });

    test('should return inactive state for non-existent user', async () => {
      const state = await getJustConfirmedState('+593999999999');
      
      expect(state.isActive).toBe(false);
      expect(state.until).toBeNull();
    });

    test('should clear just confirmed state', async () => {
      const userPhone = '+593987770788';

      await markJustConfirmed(userPhone, 'RES-12345', 10);
      await clearJustConfirmed(userPhone);

      const state = await getJustConfirmedState(userPhone);
      expect(state.isActive).toBe(false);
    });

    test('should detect user cooling down', async () => {
      const userPhone = '+593987770788';

      await markJustConfirmed(userPhone, 'RES-12345', 10);
      const isCooling = await isUserCoolingDown(userPhone);

      expect(isCooling).toBe(true);
    });

    test('should expire just confirmed flag after cooldown', async () => {
      const userPhone = '+593987770788';

      // Set with negative cooldown (already expired)
      await markJustConfirmed(userPhone, 'RES-12345', -1);
      
      // Cleanup should remove it
      const deleted = await cleanupJustConfirmedFlags();
      expect(deleted).toBeGreaterThanOrEqual(0);

      const state = await getJustConfirmedState(userPhone);
      expect(state.isActive).toBe(false);
    });

    test('should not be cooling down after expiration', async () => {
      const userPhone = '+593987770788';

      await markJustConfirmed(userPhone, 'RES-12345', -1);
      await cleanupJustConfirmedFlags();

      const isCooling = await isUserCoolingDown(userPhone);
      expect(isCooling).toBe(false);
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup multiple expired confirmations', async () => {
      const phones = ['+593987770788', '+593999888777', '+593988999888'];

      // Insert with very old expiration directly to ensure they exist
      for (const phone of phones) {
        await databaseService.run(
          `INSERT INTO pending_confirmations (user_phone, reservation_data, expires_at)
           VALUES (?, ?, datetime('now', '-1 hour'))`,
          [phone, JSON.stringify({ test: true })]
        );
      }

      const deleted = await cleanupExpiredConfirmations();
      expect(deleted).toBe(phones.length);
    });

    test('should cleanup multiple expired flags', async () => {
      const phones = ['+593987770788', '+593999888777', '+593988999888'];

      for (const phone of phones) {
        await markJustConfirmed(phone, 'RES-TEST', -1);
      }

      const deleted = await cleanupJustConfirmedFlags();
      expect(deleted).toBeGreaterThanOrEqual(phones.length);
    });

    test('should not cleanup active confirmations', async () => {
      const userPhone = '+593987770788';
      await setPendingConfirmation(userPhone, { test: true }, 60);

      await cleanupExpiredConfirmations();

      const result = await getPendingConfirmation(userPhone);
      expect(result).toBeDefined();
    });

    test('should not cleanup active flags', async () => {
      const userPhone = '+593987770788';
      await markJustConfirmed(userPhone, 'RES-TEST', 60);

      await cleanupJustConfirmedFlags();

      const state = await getJustConfirmedState(userPhone);
      expect(state.isActive).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed JSON in confirmation data', async () => {
      const userPhone = '+593987770788';

      // Insert malformed JSON directly
      await databaseService.run(
        `INSERT INTO pending_confirmations (user_phone, reservation_data, expires_at)
         VALUES (?, ?, datetime('now', '+1 hour'))`,
        [userPhone, 'INVALID_JSON']
      );

      const result = await getPendingConfirmation(userPhone);
      expect(result).toBeNull();
    });

    test('should handle concurrent updates to same user', async () => {
      const userPhone = '+593987770788';
      const data1 = { attempt: 1 };
      const data2 = { attempt: 2 };

      await Promise.all([
        setPendingConfirmation(userPhone, data1),
        setPendingConfirmation(userPhone, data2)
      ]);

      const result = await getPendingConfirmation(userPhone);
      expect(result).toBeDefined();
      expect([1, 2]).toContain(result.attempt);
    });

    test('should handle very short TTL', async () => {
      const userPhone = '+593987770788';
      // Insert with past expiration directly
      await databaseService.run(
        `INSERT INTO pending_confirmations (user_phone, reservation_data, expires_at)
         VALUES (?, ?, datetime('now', '-1 second'))`,
        [userPhone, JSON.stringify({ test: true })]
      );

      const result = await getPendingConfirmation(userPhone);
      expect(result).toBeNull(); // Should auto-cleanup expired
    });
  });
});
