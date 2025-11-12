/**
 * 🗂️ Estado de reservas basado 100% en SQLite
 */

import databaseService from '../database/database.js';
import userRepository from '../database/userRepository.js';

function nowIso() {
  return new Date().toISOString();
}

function futureIso(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

async function ensureUserExists(userPhone, metadata = {}) {
  try {
    const existing = await userRepository.findByPhone(userPhone);
    const formData = metadata?.formData || metadata;
    const candidateEmail = formData?.email || formData?.contactEmail || formData?.correo;
    const candidateName = formData?.userName || formData?.name || formData?.fullName;

    if (!existing) {
      await userRepository.create(userPhone, {
        name: candidateName || null,
        email: candidateEmail || null,
        first_visit: true,
        free_trial_used: false,
        conversation_count: 0,
        last_message_at: new Date().toISOString()
      });
      return;
    }

    const updates = {};
    if (candidateEmail && !existing.email) {
      updates.email = candidateEmail;
    }
    if (candidateName && !existing.name) {
      updates.name = candidateName;
    }

    if (Object.keys(updates).length > 0) {
      await userRepository.update(userPhone, updates);
    }
  } catch (error) {
    console.error('[RESERVATION-STATE] ⚠️ No se pudo asegurar usuario previo a escritura:', error);
    console.error('[RESERVATION-STATE] Error detalles:', error.message);
    console.error('[RESERVATION-STATE] Stack:', error.stack);
    throw error; // Propagar el error para que el flujo falle correctamente
  }
}

export async function cleanupExpiredConfirmations() {
  const result = await databaseService.run(
    'DELETE FROM pending_confirmations WHERE expires_at IS NOT NULL AND expires_at < ?',
    [nowIso()]
  );
  return result?.changes || 0;
}

export async function setPendingConfirmation(userPhone, reservationData, ttlMinutes = 30) {
  await ensureUserExists(userPhone, reservationData);
  await cleanupExpiredConfirmations();
  const expiresAt = futureIso(ttlMinutes);
  await databaseService.run(
    `INSERT INTO pending_confirmations (user_phone, reservation_data, expires_at, created_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_phone) DO UPDATE SET 
       reservation_data = excluded.reservation_data,
       expires_at = excluded.expires_at,
       created_at = CURRENT_TIMESTAMP`,
    [userPhone, JSON.stringify(reservationData), expiresAt]
  );
}

export async function getPendingConfirmation(userPhone) {
  await cleanupExpiredConfirmations();
  const row = await databaseService.get(
    'SELECT reservation_data, expires_at FROM pending_confirmations WHERE user_phone = ?',
    [userPhone]
  );

  if (!row) return null;

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await clearPendingConfirmation(userPhone);
    return null;
  }

  try {
    return JSON.parse(row.reservation_data);
  } catch {
    return null;
  }
}

export async function clearPendingConfirmation(userPhone) {
  await databaseService.run('DELETE FROM pending_confirmations WHERE user_phone = ?', [userPhone]);
}

export async function cleanupJustConfirmedFlags() {
  const result = await databaseService.run(
    `UPDATE reservation_state
     SET just_confirmed_until = NULL
     WHERE just_confirmed_until IS NOT NULL AND just_confirmed_until < ?`,
    [nowIso()]
  );
  return result?.changes || 0;
}

export async function markJustConfirmed(userPhone, reservationId = null, coolDownMinutes = 10) {
  await ensureUserExists(userPhone, { lastReservationId: reservationId });
  const until = futureIso(coolDownMinutes);
  await databaseService.run(
    `INSERT INTO reservation_state (user_phone, just_confirmed_until, last_reservation_id, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_phone) DO UPDATE SET
       just_confirmed_until = excluded.just_confirmed_until,
       last_reservation_id = excluded.last_reservation_id,
       updated_at = CURRENT_TIMESTAMP`,
    [userPhone, until, reservationId]
  );
}

export async function clearJustConfirmed(userPhone) {
  await databaseService.run(
    `UPDATE reservation_state 
     SET just_confirmed_until = NULL, last_reservation_id = last_reservation_id, updated_at = CURRENT_TIMESTAMP
     WHERE user_phone = ?`,
    [userPhone]
  );
}

export async function getJustConfirmedState(userPhone) {
  const row = await databaseService.get(
    'SELECT just_confirmed_until FROM reservation_state WHERE user_phone = ?',
    [userPhone]
  );

  if (!row || !row.just_confirmed_until) {
    return { isActive: false, until: null };
  }

  const until = new Date(row.just_confirmed_until);
  if (until > new Date()) {
    return { isActive: true, until: row.just_confirmed_until };
  }

  await clearJustConfirmed(userPhone);
  return { isActive: false, until: null };
}

export async function isUserCoolingDown(userPhone) {
  const state = await getJustConfirmedState(userPhone);
  return state.isActive;
}
