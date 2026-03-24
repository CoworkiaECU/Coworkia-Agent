/**
 * 📋 Adriana Repository — insurance_leads CRUD helpers
 * Encapsula queries de BD para KYC y competitor quotes.
 */
import databaseService from '../database-service.js';

/**
 * Actualiza los datos KYC de un lead de seguro.
 * @param {string} quoteCode
 * @param {{ kyc_cedula?: string, kyc_matricula?: string, cedula?: string, plate?: string }} kycData
 */
export async function updateKYC(quoteCode, kycData) {
  await databaseService.ensureInitialized();
  const fields = [];
  const values = [];
  let idx = 1;

  if (kycData.kyc_cedula !== undefined) {
    fields.push(`kyc_cedula = $${idx++}`);
    values.push(kycData.kyc_cedula);
  }
  if (kycData.kyc_matricula !== undefined) {
    fields.push(`kyc_matricula = $${idx++}`);
    values.push(kycData.kyc_matricula);
  }
  // Sync legacy columns too
  if (kycData.cedula !== undefined) {
    fields.push(`cedula = $${idx++}`);
    values.push(kycData.cedula);
  }
  if (kycData.plate !== undefined) {
    fields.push(`plate = $${idx++}`);
    values.push(kycData.plate);
  }

  if (fields.length === 0) return;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(quoteCode);

  await databaseService.run(
    `UPDATE insurance_leads SET ${fields.join(', ')} WHERE quote_code = $${idx}`,
    values
  );
}

/**
 * Guarda la cotización del competidor en un lead de seguro.
 * @param {string} quoteCode
 * @param {{ amount: number, insurer: string, notes?: string }} quoteData
 */
export async function saveCompetitorQuote(quoteCode, quoteData) {
  await databaseService.ensureInitialized();

  // Leer competitor_quotes existentes
  const lead = await databaseService.get(
    `SELECT competitor_quotes FROM insurance_leads WHERE quote_code = $1`,
    [quoteCode]
  );
  if (!lead) throw new Error(`Lead ${quoteCode} no encontrado`);

  let existing = [];
  try { existing = lead.competitor_quotes ? JSON.parse(lead.competitor_quotes) : []; } catch {}
  if (!Array.isArray(existing)) existing = [];

  const entry = {
    insurer: quoteData.insurer,
    amount: quoteData.amount,
    notes: quoteData.notes || '',
    added_at: new Date().toISOString(),
  };
  existing.push(entry);

  await databaseService.run(
    `UPDATE insurance_leads
     SET competitor_quotes       = $1,
         competitor_insurer      = $2,
         competitor_quote_amount = $3,
         updated_at              = CURRENT_TIMESTAMP
     WHERE quote_code = $4`,
    [JSON.stringify(existing), quoteData.insurer, quoteData.amount, quoteCode]
  );

  return entry;
}

/**
 * Devuelve un lead completo por quote_code.
 * @param {string} quoteCode
 */
export async function getLeadByCode(quoteCode) {
  await databaseService.ensureInitialized();
  return databaseService.get(
    `SELECT * FROM insurance_leads WHERE quote_code = $1`,
    [quoteCode]
  );
}
