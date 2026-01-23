/**
 * 🏠 Paula Repository - Gestión especializada de visitas inmobiliarias
 * Maneja paula_partial_visits y property_visits
 */

import databaseService from './database.js';

/**
 * 💾 Guardar visita parcial/cancelada
 */
export async function savePartialVisit(userId, visitData) {
  await databaseService.ensureInitialized();
  
  const {
    propertyCode,
    propertyName,
    propertyAddress,
    date,
    startTime,
    clientName,
    clientEmail,
    clientPhone,
    formProgress,
    cancellationReason,
    expiresAt
  } = visitData;

  await databaseService.run(
    `INSERT INTO paula_partial_visits (
      user_phone, property_code, property_name, property_address,
      date, start_time, client_name, client_email, client_phone,
      form_progress, cancellation_reason, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (user_phone) 
    DO UPDATE SET
      property_code = EXCLUDED.property_code,
      property_name = EXCLUDED.property_name,
      property_address = EXCLUDED.property_address,
      date = EXCLUDED.date,
      start_time = EXCLUDED.start_time,
      client_name = EXCLUDED.client_name,
      client_email = EXCLUDED.client_email,
      client_phone = EXCLUDED.client_phone,
      form_progress = EXCLUDED.form_progress,
      cancellation_reason = EXCLUDED.cancellation_reason,
      cancelled_at = CURRENT_TIMESTAMP,
      expires_at = EXCLUDED.expires_at`,
    [
      userId, propertyCode, propertyName, propertyAddress,
      date, startTime, clientName, clientEmail, clientPhone,
      formProgress, cancellationReason, expiresAt
    ]
  );

  console.log(`[PAULA-REPO] ✅ Visita parcial guardada: ${userId}`);
}

/**
 * 🔍 Obtener visita parcial
 */
export async function getPartialVisit(userId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM paula_partial_visits WHERE user_phone = $1`,
    [userId]
  );

  return result || null;
}

/**
 * 🗑️ Limpiar visita parcial
 */
export async function clearPartialVisit(userId) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    'DELETE FROM paula_partial_visits WHERE user_phone = $1',
    [userId]
  );

  console.log(`[PAULA-REPO] 🗑️ Visita parcial eliminada: ${userId}`);
}

/**
 * 🧹 Limpiar visitas parciales expiradas
 */
export async function cleanExpiredPartialVisits() {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.run(
    'DELETE FROM paula_partial_visits WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP'
  );

  console.log(`[PAULA-REPO] 🧹 Visitas parciales expiradas eliminadas: ${result.changes || 0}`);
  return result.changes || 0;
}

/**
 * 💾 Guardar confirmación pendiente de visita
 */
export async function savePendingConfirmation(userId, visitData) {
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
      'PAULA',
      'Paula - PropElite',
      JSON.stringify(visitData),
      'visit',
      expiresAt
    ]
  );

  console.log(`[PAULA-REPO] ⏳ Confirmación pendiente guardada: ${userId}`);
}

/**
 * 🔍 Obtener confirmación pendiente
 */
export async function getPendingConfirmation(userId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT reservation_data, expires_at, agent_type, agent_name, confirmation_type 
     FROM pending_confirmations 
     WHERE user_phone = $1 AND agent_type = 'PAULA'`,
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
    'DELETE FROM pending_confirmations WHERE user_phone = $1 AND agent_type = $2',
    [userId, 'PAULA']
  );

  console.log(`[PAULA-REPO] 🗑️ Confirmación pendiente eliminada: ${userId}`);
}
