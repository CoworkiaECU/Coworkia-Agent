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
