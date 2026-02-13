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

// ============================================================================
// REAL ESTATE LEADS - Leads inmobiliarios completos
// ============================================================================

/**
 * 💾 Guardar lead inmobiliario completo
 */
export async function saveRealEstateLead(leadData) {
  await databaseService.ensureInitialized();
  
  const {
    id,
    userId,
    operationType,
    propertyType,
    preferredZone,
    budgetRange,
    clientName,
    email,
    phone,
    requirements = {}
  } = leadData;

  await databaseService.run(
    `INSERT INTO real_estate_leads (
      id, user_phone, operation_type, property_type,
      preferred_zone, budget_range, client_name, email, phone,
      requirements, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id, userId, operationType, propertyType,
      preferredZone, budgetRange, clientName, email, phone,
      JSON.stringify(requirements), 'pending'
    ]
  );

  console.log(`[PAULA-REPO] ✅ Lead inmobiliario guardado: ${id}`);
  return { id };
}

/**
 * 🔍 Obtener lead por ID
 */
export async function getRealEstateLead(leadId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM real_estate_leads WHERE id = $1`,
    [leadId]
  );

  if (result) {
    result.requirements = typeof result.requirements === 'string'
      ? JSON.parse(result.requirements)
      : result.requirements;
    result.properties_shown = typeof result.properties_shown === 'string'
      ? JSON.parse(result.properties_shown)
      : result.properties_shown;
  }

  return result || null;
}

/**
 * 🔍 Obtener leads por usuario
 */
export async function getRealEstateLeadsByUser(userId) {
  await databaseService.ensureInitialized();
  
  const results = await databaseService.all(
    `SELECT * FROM real_estate_leads WHERE user_phone = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return results || [];
}

/**
 * 🔄 Actualizar estado de lead
 */
export async function updateRealEstateLeadStatus(leadId, status, notes = null) {
  await databaseService.ensureInitialized();
  
  const params = [status, leadId];
  let query = `UPDATE real_estate_leads SET status = $1, updated_at = CURRENT_TIMESTAMP`;
  
  if (notes) {
    query += `, notes = $3`;
    params.push(notes);
  }
  
  query += ` WHERE id = $2`;
  
  await databaseService.run(query, params);
  console.log(`[PAULA-REPO] ✅ Lead actualizado: ${leadId} → ${status}`);
}

/**
 * 📅 Agendar visita
 */
export async function schedulePropertyViewing(leadId, viewingDate) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    `UPDATE real_estate_leads 
     SET viewing_scheduled = $1, status = 'viewing_scheduled', updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [viewingDate, leadId]
  );

  console.log(`[PAULA-REPO] 📅 Visita agendada: ${leadId}`);
}

/**
 * 🏠 Agregar propiedad mostrada
 */
export async function addPropertyShown(leadId, propertyData) {
  await databaseService.ensureInitialized();
  
  const lead = await getRealEstateLead(leadId);
  if (!lead) return;

  const propertiesShown = lead.properties_shown || [];
  propertiesShown.push(propertyData);

  await databaseService.run(
    `UPDATE real_estate_leads 
     SET properties_shown = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [JSON.stringify(propertiesShown), leadId]
  );

  console.log(`[PAULA-REPO] 🏠 Propiedad agregada al historial: ${leadId}`);
}

/**
 * 📊 Obtener estadísticas de leads
 */
export async function getRealEstateLeadsStats() {
  await databaseService.ensureInitialized();
  
  const stats = await databaseService.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'viewing_scheduled' THEN 1 END) as viewings_scheduled,
      COUNT(CASE WHEN status = 'negotiating' THEN 1 END) as negotiating,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
      COUNT(CASE WHEN operation_type = 'Compra' THEN 1 END) as buyers,
      COUNT(CASE WHEN operation_type = 'Arriendo' THEN 1 END) as renters
    FROM real_estate_leads
  `);

  return stats || {};
}
