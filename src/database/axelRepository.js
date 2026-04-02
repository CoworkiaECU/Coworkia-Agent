/**
 * 🚗 Axel Repository - Gestión especializada de cotizaciones
 * Maneja axel_partial_quotes y collision_quotes
 */

import databaseService from './database.js';

/**
 * 💾 Guardar cotización parcial/cancelada
 */
export async function savePartialQuote(userId, quoteData) {
  await databaseService.ensureInitialized();
  
  const {
    damageType,
    clientName,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    email,
    phone,
    damageDescription,
    photoCount,
    formProgress,
    cancellationReason,
    expiresAt
  } = quoteData;

  await databaseService.run(
    `INSERT INTO axel_partial_quotes (
      user_phone, damage_type, client_name, vehicle_brand, vehicle_model,
      vehicle_year, email, phone, damage_description, photo_count,
      form_progress, cancellation_reason, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (user_phone) 
    DO UPDATE SET
      damage_type = EXCLUDED.damage_type,
      client_name = EXCLUDED.client_name,
      vehicle_brand = EXCLUDED.vehicle_brand,
      vehicle_model = EXCLUDED.vehicle_model,
      vehicle_year = EXCLUDED.vehicle_year,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      damage_description = EXCLUDED.damage_description,
      photo_count = EXCLUDED.photo_count,
      form_progress = EXCLUDED.form_progress,
      cancellation_reason = EXCLUDED.cancellation_reason,
      cancelled_at = CURRENT_TIMESTAMP,
      expires_at = EXCLUDED.expires_at`,
    [
      userId, damageType, clientName, vehicleBrand, vehicleModel,
      vehicleYear, email, phone, damageDescription, photoCount,
      formProgress, cancellationReason, expiresAt
    ]
  );

  console.log(`[AXEL-REPO] ✅ Cotización parcial guardada: ${userId}`);
}

/**
 * 🔍 Obtener cotización parcial
 */
export async function getPartialQuote(userId) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM axel_partial_quotes WHERE user_phone = $1`,
    [userId]
  );

  return result || null;
}

/**
 * 🗑️ Limpiar cotización parcial
 */
export async function clearPartialQuote(userId) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    'DELETE FROM axel_partial_quotes WHERE user_phone = $1',
    [userId]
  );

  console.log(`[AXEL-REPO] 🗑️ Cotización parcial eliminada: ${userId}`);
}

/**
 * 🧹 Limpiar cotizaciones parciales expiradas
 */
export async function cleanExpiredPartialQuotes() {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.run(
    'DELETE FROM axel_partial_quotes WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP'
  );

  console.log(`[AXEL-REPO] 🧹 Cotizaciones parciales expiradas eliminadas: ${result.changes || 0}`);
  return result.changes || 0;
}

// ============================================================================
// COLLISION QUOTES - Cotizaciones completas
// ============================================================================

/**
 * 💾 Guardar cotización de colisión completa
 */
export async function saveCollisionQuote(quoteData) {
  await databaseService.ensureInitialized();
  
  const {
    id,
    quoteCode,
    userId,
    damageType,
    clientName,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    email,
    phone,
    damageDescription,
    photoUrls = [],
    damageAnalysis = {},
    quoteDetails,
    priceMin,
    priceMax,
    sessionFingerprint
  } = quoteData;

  await databaseService.run(
    `INSERT INTO collision_quotes (
      id, quote_code, user_phone, damage_type, client_name,
      vehicle_brand, vehicle_model, vehicle_year, email, phone,
      damage_description, photo_urls, damage_analysis, quote_details,
      price_min, price_max, currency, session_fingerprint,
      status, quote_sent_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)`,
    [
      id, quoteCode, userId, damageType, clientName,
      vehicleBrand, vehicleModel, vehicleYear, email, phone,
      damageDescription, JSON.stringify(photoUrls), JSON.stringify(damageAnalysis),
      quoteDetails, priceMin, priceMax, 'USD', sessionFingerprint,
      'quoted'
    ]
  );

  console.log(`[AXEL-REPO] ✅ Cotización de colisión guardada: ${quoteCode}`);
  return { id, quoteCode };
}

/**
 * 🔍 Obtener cotización por código
 */
export async function getCollisionQuote(quoteCode) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM collision_quotes WHERE quote_code = $1`,
    [quoteCode]
  );

  if (result) {
    // Parse JSONB fields
    result.photo_urls = typeof result.photo_urls === 'string'
      ? JSON.parse(result.photo_urls)
      : result.photo_urls;
    result.damage_analysis = typeof result.damage_analysis === 'string'
      ? JSON.parse(result.damage_analysis)
      : result.damage_analysis;
  }

  return result || null;
}

/**
 * 🔍 Obtener cotizaciones por usuario
 */
export async function getCollisionQuotesByUser(userId) {
  await databaseService.ensureInitialized();
  
  const results = await databaseService.all(
    `SELECT * FROM collision_quotes WHERE user_phone = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return results || [];
}

/**
 * 🔄 Actualizar estado de cotización
 */
export async function updateCollisionQuoteStatus(quoteCode, status, notes = null) {
  await databaseService.ensureInitialized();
  
  const params = [status, quoteCode];
  let query = `UPDATE collision_quotes SET status = $1, updated_at = CURRENT_TIMESTAMP`;
  
  if (notes) {
    query += `, notes = $3`;
    params.push(notes);
  }
  
  query += ` WHERE quote_code = $2`;
  
  await databaseService.run(query, params);
  console.log(`[AXEL-REPO] ✅ Cotización actualizada: ${quoteCode} → ${status}`);
}

/**
 * 📊 Obtener estadísticas de cotizaciones
 */
export async function getCollisionQuotesStats() {
  await databaseService.ensureInitialized();
  
  const stats = await databaseService.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'quoted' THEN 1 END) as quoted,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      AVG((price_min + price_max) / 2) as avg_quote
    FROM collision_quotes
  `);

  return stats || {};
}

/**
 * 📅 Agendar inspección en taller
 */
export async function scheduleWorkshopInspection(quoteCode, inspectionDate, inspectionTime) {
  await databaseService.ensureInitialized();

  const dateTimeStr = `${inspectionDate}T${inspectionTime}:00`;

  await databaseService.run(
    `UPDATE collision_quotes
     SET inspection_scheduled = $1, status = 'accepted', updated_at = CURRENT_TIMESTAMP
     WHERE quote_code = $2`,
    [dateTimeStr, quoteCode]
  );

  console.log(`[AXEL-REPO] 📅 Inspección agendada: ${quoteCode} → ${dateTimeStr}`);
}

/**
 * 🔍 Obtener cotizaciones que necesitan recordatorio 1 (24h post-envío, no agendadas)
 */
export async function findQuotesForReminder1() {
  await databaseService.ensureInitialized();

  const results = await databaseService.all(`
    SELECT quote_code, user_phone, phone, client_name, email, vehicle_brand, vehicle_model,
           vehicle_year, price_min, price_max, quote_sent_at
    FROM collision_quotes
    WHERE email IS NOT NULL
      AND inspection_scheduled IS NULL
      AND reminder_1_sent_at IS NULL
      AND status NOT IN ('completed', 'cancelled')
      AND quote_sent_at IS NOT NULL
      AND quote_sent_at <= NOW() - INTERVAL '24 hours'
      AND quote_sent_at >= NOW() - INTERVAL '7 days'
    ORDER BY quote_sent_at ASC
    LIMIT 20
  `);

  return results || [];
}

/**
 * 🔍 Obtener cotizaciones que necesitan recordatorio 2 (7 días post-envío, no agendadas)
 */
export async function findQuotesForReminder2() {
  await databaseService.ensureInitialized();

  const results = await databaseService.all(`
    SELECT quote_code, user_phone, phone, client_name, email, vehicle_brand, vehicle_model,
           vehicle_year, price_min, price_max, quote_sent_at
    FROM collision_quotes
    WHERE email IS NOT NULL
      AND inspection_scheduled IS NULL
      AND reminder_2_sent_at IS NULL
      AND reminder_1_sent_at IS NOT NULL
      AND status NOT IN ('completed', 'cancelled')
      AND quote_sent_at IS NOT NULL
      AND quote_sent_at <= NOW() - INTERVAL '7 days'
      AND quote_sent_at >= NOW() - INTERVAL '30 days'
    ORDER BY quote_sent_at ASC
    LIMIT 20
  `);

  return results || [];
}

/**
 * ✅ Marcar recordatorio 1 como enviado
 */
export async function markReminder1Sent(quoteCode) {
  await databaseService.ensureInitialized();
  await databaseService.run(
    `UPDATE collision_quotes SET reminder_1_sent_at = CURRENT_TIMESTAMP WHERE quote_code = $1`,
    [quoteCode]
  );
}

/**
 * ✅ Marcar recordatorio 2 como enviado
 */
export async function markReminder2Sent(quoteCode) {
  await databaseService.ensureInitialized();
  await databaseService.run(
    `UPDATE collision_quotes SET reminder_2_sent_at = CURRENT_TIMESTAMP WHERE quote_code = $1`,
    [quoteCode]
  );
}
