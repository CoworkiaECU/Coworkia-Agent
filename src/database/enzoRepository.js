/**
 * 📊 Enzo Repository - Gestión de proyectos MarketingLab
 * Maneja marketing_leads completas
 */

import databaseService from './database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 💾 Guardar lead de proyecto de marketing
 */
export async function saveMarketingLead(leadData) {
  await databaseService.ensureInitialized();
  
  const {
    projectCode,
    userId,
    projectType,
    company,
    clientName,
    email,
    phone,
    budgetRange,
    urgency,
    description
  } = leadData;

  const id = uuidv4();

  await databaseService.run(
    `INSERT INTO marketing_leads (
      id, project_code, user_phone, project_type,
      company, client_name, email, phone,
      budget_range, urgency, description, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id, projectCode, userId, projectType,
      company, clientName, email, phone,
      budgetRange, urgency, description, 'pending'
    ]
  );

  console.log(`[ENZO-REPO] ✅ Lead de marketing guardado: ${projectCode}`);
  return { id, projectCode };
}

/**
 * 🔍 Obtener lead por código de proyecto
 */
export async function getMarketingLead(projectCode) {
  await databaseService.ensureInitialized();
  
  const result = await databaseService.get(
    `SELECT * FROM marketing_leads WHERE project_code = $1`,
    [projectCode]
  );

  return result || null;
}

/**
 * 🔍 Obtener leads por usuario
 */
export async function getMarketingLeadsByUser(userId) {
  await databaseService.ensureInitialized();
  
  const results = await databaseService.all(
    `SELECT * FROM marketing_leads WHERE user_phone = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return results || [];
}

/**
 * 🔄 Actualizar estado de lead
 */
export async function updateMarketingLeadStatus(projectCode, status, notes = null) {
  await databaseService.ensureInitialized();
  
  const params = [status, projectCode];
  let query = `UPDATE marketing_leads SET status = $1, updated_at = CURRENT_TIMESTAMP`;
  
  if (notes) {
    query += `, notes = $3`;
    params.push(notes);
  }
  
  query += ` WHERE project_code = $2`;
  
  await databaseService.run(query, params);
  console.log(`[ENZO-REPO] ✅ Lead actualizado: ${projectCode} → ${status}`);
}

/**
 * 📅 Agendar reunión
 */
export async function scheduleMarketingMeeting(projectCode, meetingDate) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    `UPDATE marketing_leads 
     SET meeting_scheduled = $1, status = 'meeting_scheduled', updated_at = CURRENT_TIMESTAMP
     WHERE project_code = $2`,
    [meetingDate, projectCode]
  );

  console.log(`[ENZO-REPO] 📅 Reunión agendada: ${projectCode}`);
}

/**
 * 💰 Guardar propuesta enviada
 */
export async function saveMarketingProposal(projectCode, proposalAmount) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    `UPDATE marketing_leads 
     SET proposal_amount = $1, proposal_sent_at = CURRENT_TIMESTAMP, 
         status = 'proposal_sent', updated_at = CURRENT_TIMESTAMP
     WHERE project_code = $2`,
    [proposalAmount, projectCode]
  );

  console.log(`[ENZO-REPO] 💰 Propuesta guardada: ${projectCode} - $${proposalAmount}`);
}

/**
 * 📊 Obtener estadísticas de leads
 */
export async function getMarketingLeadsStats() {
  await databaseService.ensureInitialized();
  
  const stats = await databaseService.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'meeting_scheduled' THEN 1 END) as meetings_scheduled,
      COUNT(CASE WHEN status = 'proposal_sent' THEN 1 END) as proposals_sent,
      COUNT(CASE WHEN status = 'negotiating' THEN 1 END) as negotiating,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
      AVG(proposal_amount) as avg_proposal
    FROM marketing_leads
  `);

  return stats || {};
}

/**
 * 📋 Obtener leads por tipo de proyecto
 */
export async function getMarketingLeadsByType(projectType) {
  await databaseService.ensureInitialized();
  
  const results = await databaseService.all(
    `SELECT * FROM marketing_leads WHERE project_type = $1 ORDER BY created_at DESC`,
    [projectType]
  );

  return results || [];
}

/**
 * 🎯 Obtener leads urgentes
 */
export async function getUrgentMarketingLeads() {
  await databaseService.ensureInitialized();
  
  const results = await databaseService.all(
    `SELECT * FROM marketing_leads 
     WHERE urgency = 'Urgente' 
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY created_at DESC`
  );

  return results || [];
}

export default {
  saveMarketingLead,
  getMarketingLead,
  getMarketingLeadsByUser,
  updateMarketingLeadStatus,
  scheduleMarketingMeeting,
  saveMarketingProposal,
  getMarketingLeadsStats,
  getMarketingLeadsByType,
  getUrgentMarketingLeads
};
