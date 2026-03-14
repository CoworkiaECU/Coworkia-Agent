/**
 * ⚖️ Gabi Repository - Gestión de consultoría legal/contable GR Consulting
 * Maneja legal_leads completas
 */

import databaseService from './database.js';
import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository.js';

const _base = new BaseRepository({
  table:      'legal_leads',
  codeColumn: 'consultation_code',
  userColumn: 'user_phone',
  logPrefix:  'GABI-REPO',
});

/**
 * 💾 Guardar lead de consultoría legal/contable
 */
export async function saveLegalLead(leadData) {
  await databaseService.ensureInitialized();
  
  const {
    consultationCode,
    userId,
    consultationType,
    company,
    ruc,
    clientName,
    email,
    phone,
    description,
    urgency = 'Normal'
  } = leadData;

  const id = uuidv4();

  await databaseService.run(
    `INSERT INTO legal_leads (
      id, consultation_code, user_phone, consultation_type,
      company, ruc, client_name, email, phone,
      description, urgency, status, assigned_to
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id, consultationCode, userId, consultationType,
      company, ruc, clientName, email, phone,
      description, urgency, 'pending', 'Gabi'
    ]
  );

  console.log(`[GABI-REPO] ✅ Lead de consultoría guardado: ${consultationCode}`);
  return { id, consultationCode };
}

/** 🔍 Obtener lead por código */
export const getLegalLead = (consultationCode) => _base.getByCode(consultationCode);

/** 🔍 Obtener leads por usuario */
export const getLegalLeadsByUser = (userId) => _base.getByUser(userId);

/** 🔄 Actualizar estado de lead */
export const updateLegalLeadStatus = (consultationCode, status, notes) => _base.updateStatus(consultationCode, status, notes);

/** 📅 Agendar reunión */
export const scheduleLegalMeeting = (consultationCode, meetingDate) => _base.scheduleMeeting(consultationCode, meetingDate);

/**
 * 💰 Guardar cotización enviada
 */
export async function saveLegalQuote(consultationCode, quoteAmount) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    `UPDATE legal_leads 
     SET quote_amount = $1, quote_sent_at = CURRENT_TIMESTAMP, 
         status = 'quote_sent', updated_at = CURRENT_TIMESTAMP
     WHERE consultation_code = $2`,
    [quoteAmount, consultationCode]
  );

  console.log(`[GABI-REPO] 💰 Cotización guardada: ${consultationCode} - $${quoteAmount}`);
}

/**
 * 📊 Obtener estadísticas de leads
 */
export async function getLegalLeadsStats() {
  await databaseService.ensureInitialized();
  
  const stats = await databaseService.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'meeting_scheduled' THEN 1 END) as meetings_scheduled,
      COUNT(CASE WHEN status = 'quote_sent' THEN 1 END) as quotes_sent,
      COUNT(CASE WHEN status = 'service_in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      AVG(quote_amount) as avg_quote
    FROM legal_leads
  `);

  return stats || {};
}

/** 📋 Obtener leads por tipo de consulta */
export const getLegalLeadsByType = (consultationType) => _base.getByType('consultation_type', consultationType);

export default {
  saveLegalLead,
  getLegalLead,
  getLegalLeadsByUser,
  updateLegalLeadStatus,
  scheduleLegalMeeting,
  saveLegalQuote,
  getLegalLeadsStats,
  getLegalLeadsByType
};
