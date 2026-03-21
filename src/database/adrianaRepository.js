/**
 * 🛡️ Adriana Repository - Gestión de seguros SegPopular
 * Maneja insurance_leads completas
 */

import databaseService from './database.js';
import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository.js';

const _base = new BaseRepository({
  table:      'insurance_leads',
  codeColumn: 'quote_code',
  userColumn: 'user_phone',
  logPrefix:  'ADRIANA-REPO',
});

/**
 * 💾 Guardar lead de seguro completo
 */
export async function saveInsuranceLead(leadData) {
  await databaseService.ensureInitialized();
  
  const {
    quoteCode,
    userId,
    insuranceType,
    city,
    commercialValue,
    plate,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    motor,
    chasis,
    originCountry,
    licenseType,
    licenseExpiry,
    clientName,
    cedula,
    email,
    phone,
    matriculaImages = [],
    licenciaImages = [],
    quotedPremium,
    premiumBreakdown = {}
  } = leadData;

  const id = uuidv4();

  await databaseService.run(
    `INSERT INTO insurance_leads (
      id, quote_code, user_phone, agent_name, insurance_type,
      city, commercial_value, plate, vehicle_brand, vehicle_model,
      vehicle_year, motor, chasis, origin_country, license_type,
      license_expiry, client_name, cedula, email, phone,
      matricula_images, licencia_images, quoted_premium, premium_breakdown,
      status, quote_sent_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, CURRENT_TIMESTAMP)`,
    [
      id, quoteCode, userId, 'ADRIANA', insuranceType,
      city, commercialValue, plate, vehicleBrand, vehicleModel,
      vehicleYear, motor, chasis, originCountry, licenseType,
      licenseExpiry, clientName, cedula, email, phone,
      JSON.stringify(matriculaImages), JSON.stringify(licenciaImages),
      quotedPremium, JSON.stringify(premiumBreakdown),
      'quoted'
    ]
  );

  console.log(`[ADRIANA-REPO] ✅ Lead de seguro guardado: ${quoteCode}`);
  return { id, quoteCode };
}

/**
 * 🔍 Obtener lead de seguro por código
 */
export async function getInsuranceLead(quoteCode) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM insurance_leads WHERE quote_code = $1`,
    [quoteCode]
  );

  if (result) {
    // Parse JSONB fields
    result.matricula_images = typeof result.matricula_images === 'string' 
      ? JSON.parse(result.matricula_images) 
      : result.matricula_images;
    result.licencia_images = typeof result.licencia_images === 'string'
      ? JSON.parse(result.licencia_images)
      : result.licencia_images;
    result.premium_breakdown = typeof result.premium_breakdown === 'string'
      ? JSON.parse(result.premium_breakdown)
      : result.premium_breakdown;
  }

  return result || null;
}

/** 🔍 Obtener leads por usuario */
export const getInsuranceLeadsByUser = (userId) => _base.getByUser(userId);

/** 🔄 Actualizar estado de lead */
export const updateInsuranceLeadStatus = (quoteCode, status, notes) => _base.updateStatus(quoteCode, status, notes);

/**
 * 📊 Obtener estadísticas de leads
 */
export async function getInsuranceLeadsStats() {
  await databaseService.ensureInitialized();
  
  const stats = await databaseService.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'quoted' THEN 1 END) as quoted,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
      AVG(quoted_premium) as avg_premium
    FROM insurance_leads
  `);

  return stats || {};
}

// ─────────────────────────────────────────────────────────────
// FORMULARIO CONVERSACIONAL — adriana_quote_leads
// ─────────────────────────────────────────────────────────────

/**
 * 🔍 Obtener estado activo de cotización por teléfono
 */
export async function getQuoteLead(phone) {
  await databaseService.ensureInitialized();
  return await databaseService.get(
    `SELECT * FROM adriana_quote_leads WHERE phone = $1`,
    [phone]
  );
}

/**
 * 💾 Crear o actualizar lead de cotización conversacional
 */
export async function upsertQuoteLead(phone, data = {}) {
  await databaseService.ensureInitialized();
  await databaseService.run(
    `INSERT INTO adriana_quote_leads
       (phone, status, client_name, client_email, vehicle_data, id_card_data,
        selected_coverage, premium_data, quote_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (phone) DO UPDATE SET
       status            = EXCLUDED.status,
       client_name       = COALESCE(EXCLUDED.client_name,       adriana_quote_leads.client_name),
       client_email      = COALESCE(EXCLUDED.client_email,      adriana_quote_leads.client_email),
       vehicle_data      = COALESCE(EXCLUDED.vehicle_data,      adriana_quote_leads.vehicle_data),
       id_card_data      = COALESCE(EXCLUDED.id_card_data,      adriana_quote_leads.id_card_data),
       selected_coverage = COALESCE(EXCLUDED.selected_coverage, adriana_quote_leads.selected_coverage),
       premium_data      = COALESCE(EXCLUDED.premium_data,      adriana_quote_leads.premium_data),
       quote_code        = COALESCE(EXCLUDED.quote_code,        adriana_quote_leads.quote_code),
       updated_at        = CURRENT_TIMESTAMP`,
    [
      phone,
      data.status           || 'gathering_vehicle',
      data.clientName       || null,
      data.clientEmail      || null,
      data.vehicleData      ? JSON.stringify(data.vehicleData)  : null,
      data.idCardData       ? JSON.stringify(data.idCardData)   : null,
      data.selectedCoverage || null,
      data.premiumData      ? JSON.stringify(data.premiumData)  : null,
      data.quoteCode        || null,
    ]
  );
}

/**
 * ✏️ Actualizar campos específicos de un quote lead
 */
export async function updateQuoteLeadData(phone, updates = {}) {
  await databaseService.ensureInitialized();
  const set = ['updated_at = CURRENT_TIMESTAMP'];
  const vals = [phone];
  let i = 2;
  const add = (col, val) => { set.push(`${col} = $${i++}`); vals.push(val); };

  if (updates.status           !== undefined) add('status',            updates.status);
  if (updates.clientName       !== undefined) add('client_name',       updates.clientName);
  if (updates.clientEmail      !== undefined) add('client_email',      updates.clientEmail);
  if (updates.vehicleData      !== undefined) add('vehicle_data',      JSON.stringify(updates.vehicleData));
  if (updates.idCardData       !== undefined) add('id_card_data',      JSON.stringify(updates.idCardData));
  if (updates.selectedCoverage !== undefined) add('selected_coverage', updates.selectedCoverage);
  if (updates.premiumData      !== undefined) add('premium_data',      JSON.stringify(updates.premiumData));
  if (updates.quoteCode        !== undefined) add('quote_code',        updates.quoteCode);

  await databaseService.run(
    `UPDATE adriana_quote_leads SET ${set.join(', ')} WHERE phone = $1`,
    vals
  );
}

/**
 * 🗑️ Eliminar lead de cotización (flujo completado o cancelado)
 */
export async function deleteQuoteLead(phone) {
  await databaseService.ensureInitialized();
  await databaseService.run(
    `DELETE FROM adriana_quote_leads WHERE phone = $1`,
    [phone]
  );
}

export default {
  saveInsuranceLead,
  getInsuranceLead,
  getInsuranceLeadsByUser,
  updateInsuranceLeadStatus,
  getInsuranceLeadsStats,
  getQuoteLead,
  upsertQuoteLead,
  updateQuoteLeadData,
  deleteQuoteLead,
};
