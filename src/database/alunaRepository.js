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

// ============================================================================
// MEMBERSHIP LEADS - Leads de membresía completas
// ============================================================================

/**
 * 💾 Guardar lead de membresía completa
 */
export async function saveMembershipLead(leadData) {
  await databaseService.ensureInitialized();
  
  const {
    id,
    membershipCode,
    userId,
    membershipType,
    startDate,
    clientName,
    email,
    phone,
    companyName,
    specialRequirements,
    monthlyFee
  } = leadData;

  await databaseService.run(
    `INSERT INTO membership_leads (
      id, membership_code, user_phone, membership_type,
      start_date, client_name, email, phone,
      company_name, special_requirements, monthly_fee,
      status, quote_sent_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
    [
      id, membershipCode, userId, membershipType,
      startDate, clientName, email, phone,
      companyName, specialRequirements, monthlyFee,
      'quoted'
    ]
  );

  console.log(`[ALUNA-REPO] ✅ Lead de membresía guardado: ${membershipCode}`);
  return { id, membershipCode };
}

/**
 * 🔍 Obtener lead por código
 */
export async function getMembershipLead(membershipCode) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM membership_leads WHERE membership_code = $1`,
    [membershipCode]
  );

  return result || null;
}

/**
 * 🔍 Obtener leads por usuario
 */
export async function getMembershipLeadsByUser(userId) {
  await databaseService.ensureInitialized();
  
  const results = await databaseService.all(
    `SELECT * FROM membership_leads WHERE user_phone = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return results || [];
}

/**
 * 🔄 Actualizar estado de lead
 */
export async function updateMembershipLeadStatus(membershipCode, status, notes = null) {
  await databaseService.ensureInitialized();
  
  const params = [status, membershipCode];
  let query = `UPDATE membership_leads SET status = $1, updated_at = CURRENT_TIMESTAMP`;
  
  if (notes) {
    query += `, notes = $3`;
    params.push(notes);
  }
  
  query += ` WHERE membership_code = $2`;
  
  await databaseService.run(query, params);
  console.log(`[ALUNA-REPO] ✅ Lead actualizado: ${membershipCode} → ${status}`);
}

// ============================================================================
// ALUNA PROSPECT FOLLOW-UPS - Seguimiento de usuarios con interés en membresías
// ============================================================================

/**
 * 📌 Registrar (o actualizar nombre/tipo) a un prospecto de Aluna.
 * Idempotente: si el usuario ya existe, solo actualiza nombre y tipo si cambian.
 */
export async function trackAlunaProspect(userPhone, userName = null, membershipType = null) {
  await databaseService.ensureInitialized();
  try {
    await databaseService.run(
      `INSERT INTO aluna_prospect_followups (user_phone, user_name, membership_type, interest_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_phone) DO UPDATE
         SET user_name      = COALESCE($2, aluna_prospect_followups.user_name),
             membership_type = COALESCE($3, aluna_prospect_followups.membership_type),
             updated_at     = CURRENT_TIMESTAMP
         WHERE aluna_prospect_followups.converted_at IS NULL`,
      [userPhone, userName, membershipType]
    );
    console.log(`[ALUNA-REPO] 📌 Prospecto Aluna registrado/actualizado: ${userPhone}`);
  } catch (err) {
    // No crítico: no interrumpir el flujo principal si esto falla
    console.warn('[ALUNA-REPO] ⚠️ trackAlunaProspect no crítico:', err.message);
  }
}

/**
 * 🔍 Prospectos que necesitan follow-up de 24 horas
 * (han pasado ≥24h desde interest_at, sin followup_24h aún, sin conversión)
 */
export async function findProspectsFor24hFollowUp() {
  await databaseService.ensureInitialized();
  return databaseService.all(
    `SELECT user_phone, user_name, membership_type, interest_at
       FROM aluna_prospect_followups
      WHERE followup_24h_sent_at IS NULL
        AND converted_at IS NULL
        AND interest_at <= NOW() - INTERVAL '24 hours'
      ORDER BY interest_at ASC
      LIMIT 50`,
    []
  );
}

/**
 * 🔍 Prospectos que necesitan follow-up de 3 días
 * (han pasado ≥72h desde followup_24h_sent_at, sin followup_3d aún, sin conversión)
 */
export async function findProspectsFor3dFollowUp() {
  await databaseService.ensureInitialized();
  return databaseService.all(
    `SELECT user_phone, user_name, membership_type, interest_at, followup_24h_sent_at
       FROM aluna_prospect_followups
      WHERE followup_24h_sent_at IS NOT NULL
        AND followup_3d_sent_at IS NULL
        AND converted_at IS NULL
        AND followup_24h_sent_at <= NOW() - INTERVAL '72 hours'
      ORDER BY followup_24h_sent_at ASC
      LIMIT 50`,
    []
  );
}

/** Marca el follow-up de 24h como enviado */
export async function markProspect24hSent(userPhone) {
  await databaseService.ensureInitialized();
  await databaseService.run(
    `UPDATE aluna_prospect_followups
        SET followup_24h_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_phone = $1`,
    [userPhone]
  );
}

/** Marca el follow-up de 3 días como enviado */
export async function markProspect3dSent(userPhone) {
  await databaseService.ensureInitialized();
  await databaseService.run(
    `UPDATE aluna_prospect_followups
        SET followup_3d_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_phone = $1`,
    [userPhone]
  );
}

/** Marca al prospecto como convertido (pagó/activó membresía) */
export async function markAlunaProspectConverted(userPhone) {
  await databaseService.ensureInitialized();
  try {
    await databaseService.run(
      `UPDATE aluna_prospect_followups
          SET converted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_phone = $1 AND converted_at IS NULL`,
      [userPhone]
    );
    console.log(`[ALUNA-REPO] ✅ Prospecto marcado como convertido: ${userPhone}`);
  } catch (err) {
    console.warn('[ALUNA-REPO] ⚠️ markAlunaProspectConverted no crítico:', err.message);
  }
}

/**
 * 📊 Obtener estadísticas de leads
 */
export async function getMembershipLeadsStats() {
  await databaseService.ensureInitialized();
  
  const stats = await databaseService.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'quoted' THEN 1 END) as quoted,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
      AVG(monthly_fee) as avg_monthly_fee
    FROM membership_leads
  `);

  return stats || {};
}
