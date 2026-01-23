/**
 * 🌟 Aurora Repository - Gestión especializada de reservas
 * Reemplaza partial_forms genérica con aurora_partial_reservations
 */

import databaseService from './database.js';

/**
 * 💾 Guardar reserva parcial/cancelada
 */
export async function savePartialReservation(userId, reservationData) {
  await databaseService.ensureInitialized();
  
  const {
    serviceType,
    date,
    startTime,
    endTime,
    durationHours,
    guestCount,
    totalPrice,
    wasFree,
    formProgress,
    cancellationReason,
    expiresAt
  } = reservationData;

  await databaseService.run(
    `INSERT INTO aurora_partial_reservations (
      user_phone, service_type, date, start_time, end_time,
      duration_hours, guest_count, total_price, was_free,
      form_progress, cancellation_reason, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (user_phone) 
    DO UPDATE SET
      service_type = EXCLUDED.service_type,
      date = EXCLUDED.date,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      duration_hours = EXCLUDED.duration_hours,
      guest_count = EXCLUDED.guest_count,
      total_price = EXCLUDED.total_price,
      was_free = EXCLUDED.was_free,
      form_progress = EXCLUDED.form_progress,
      cancellation_reason = EXCLUDED.cancellation_reason,
      cancelled_at = CURRENT_TIMESTAMP,
      expires_at = EXCLUDED.expires_at`,
    [
      userId, serviceType, date, startTime, endTime,
      durationHours, guestCount, totalPrice, wasFree,
      formProgress, cancellationReason, expiresAt
    ]
  );

  console.log(`[AURORA-REPO] ✅ Reserva parcial guardada: ${userId}`);
}

/**
 * 🔍 Obtener reserva parcial
 */
export async function getPartialReservation(userId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM aurora_partial_reservations WHERE user_phone = $1`,
    [userId]
  );

  return result || null;
}

/**
 * 🗑️ Limpiar reserva parcial
 */
export async function clearPartialReservation(userId) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    'DELETE FROM aurora_partial_reservations WHERE user_phone = $1',
    [userId]
  );

  console.log(`[AURORA-REPO] 🗑️ Reserva parcial eliminada: ${userId}`);
}

/**
 * 🧹 Limpiar reservas parciales expiradas
 */
export async function cleanExpiredPartialReservations() {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.run(
    'DELETE FROM aurora_partial_reservations WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP'
  );

  console.log(`[AURORA-REPO] 🧹 Reservas parciales expiradas eliminadas: ${result.changes || 0}`);
  return result.changes || 0;
}

/**
 * 💾 Guardar confirmación pendiente de reserva
 */
export async function savePendingConfirmation(userId, reservationData) {
  await databaseService.ensureInitialized();
  
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

  await databaseService.run(
    `INSERT INTO pending_confirmations (
      user_phone, agent_type, agent_name, reservation_data, 
      confirmation_type, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_phone) 
    DO UPDATE SET
      agent_type = EXCLUDED.agent_type,
      agent_name = EXCLUDED.agent_name,
      reservation_data = EXCLUDED.reservation_data,
      confirmation_type = EXCLUDED.confirmation_type,
      created_at = CURRENT_TIMESTAMP,
      expires_at = EXCLUDED.expires_at`,
    [
      userId,
      'AURORA',
      'Aurora Core',
      JSON.stringify(reservationData),
      'reservation',
      expiresAt
    ]
  );

  console.log(`[AURORA-REPO] ⏳ Confirmación pendiente guardada: ${userId}`);
}

/**
 * 🔍 Obtener confirmación pendiente
 */
export async function getPendingConfirmation(userId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT reservation_data, expires_at, agent_type, agent_name, confirmation_type 
     FROM pending_confirmations 
     WHERE user_phone = $1`,
    [userId]
  );

  if (!result) return null;

  return {
    ...JSON.parse(result.reservation_data),
    expiresAt: result.expires_at,
    agentType: result.agent_type,
    agentName: result.agent_name,
    confirmationType: result.confirmation_type
  };
}

/**
 * 🗑️ Limpiar confirmación pendiente
 */
export async function clearPendingConfirmation(userId) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    'DELETE FROM pending_confirmations WHERE user_phone = $1',
    [userId]
  );

  console.log(`[AURORA-REPO] 🗑️ Confirmación pendiente eliminada: ${userId}`);
}
