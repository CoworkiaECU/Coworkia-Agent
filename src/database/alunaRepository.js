/**
 * 💼 Aluna Repository - Gestión especializada de membresías
 * Maneja aluna_partial_memberships y pending_confirmations
 */

import databaseService from './database.js';

/**
 * 💾 Guardar membresía parcial/cancelada
 */
export async function savePartialMembership(userId, membershipData) {
  await databaseService.ensureInitialized();
  
  const {
    membershipType,
    startDate,
    clientName,
    email,
    phone,
    companyName,
    specialRequirements,
    monthlyFee,
    formProgress,
    cancellationReason,
    expiresAt
  } = membershipData;

  await databaseService.run(
    `INSERT INTO aluna_partial_memberships (
      user_phone, membership_type, start_date, client_name, email, phone,
      company_name, special_requirements, monthly_fee, form_progress,
      cancellation_reason, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (user_phone) 
    DO UPDATE SET
      membership_type = EXCLUDED.membership_type,
      start_date = EXCLUDED.start_date,
      client_name = EXCLUDED.client_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      special_requirements = EXCLUDED.special_requirements,
      monthly_fee = EXCLUDED.monthly_fee,
      form_progress = EXCLUDED.form_progress,
      cancellation_reason = EXCLUDED.cancellation_reason,
      cancelled_at = CURRENT_TIMESTAMP,
      expires_at = EXCLUDED.expires_at`,
    [
      userId, membershipType, startDate, clientName, email, phone,
      companyName, specialRequirements, monthlyFee, formProgress,
      cancellationReason, expiresAt
    ]
  );

  console.log(`[ALUNA-REPO] ✅ Membresía parcial guardada: ${userId}`);
}

/**
 * 🔍 Obtener membresía parcial
 */
export async function getPartialMembership(userId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM aluna_partial_memberships WHERE user_phone = $1`,
    [userId]
  );

  return result || null;
}

/**
 * 🗑️ Limpiar membresía parcial
 */
export async function clearPartialMembership(userId) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    'DELETE FROM aluna_partial_memberships WHERE user_phone = $1',
    [userId]
  );

  console.log(`[ALUNA-REPO] 🗑️ Membresía parcial eliminada: ${userId}`);
}

/**
 * 🧹 Limpiar membresías parciales expiradas
 */
export async function cleanExpiredPartialMemberships() {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.run(
    'DELETE FROM aluna_partial_memberships WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP'
  );

  console.log(`[ALUNA-REPO] 🧹 Membresías parciales expiradas eliminadas: ${result.changes || 0}`);
  return result.changes || 0;
}

/**
 * 💾 Guardar confirmación pendiente de membresía
 */
export async function savePendingConfirmation(userId, membershipData) {
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
      'ALUNA',
      'Aluna - Closer Membresías',
      JSON.stringify(membershipData),
      'membership',
      expiresAt
    ]
  );

  console.log(`[ALUNA-REPO] ⏳ Confirmación pendiente guardada: ${userId}`);
}

/**
 * 🔍 Obtener confirmación pendiente
 */
export async function getPendingConfirmation(userId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT reservation_data, expires_at, agent_type, agent_name, confirmation_type 
     FROM pending_confirmations 
     WHERE user_phone = $1 AND agent_type = 'ALUNA'`,
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
    [userId, 'ALUNA']
  );

  console.log(`[ALUNA-REPO] 🗑️ Confirmación pendiente eliminada: ${userId}`);
}
