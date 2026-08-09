/**
 * 📊 Enzo Repository - Gestión de proyectos MarketingLab
 * Maneja marketing_leads completas
 */

import { createHash } from 'crypto';

import databaseService from './database.js';
import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository.js';

const _base = new BaseRepository({
  table:      'marketing_leads',
  codeColumn: 'project_code',
  userColumn: 'user_phone',
  logPrefix:  'ENZO-REPO',
});

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

/** 🔍 Obtener lead por código de proyecto */
export const getMarketingLead = (projectCode) => _base.getByCode(projectCode);

/** 🔍 Obtener leads por usuario */
export const getMarketingLeadsByUser = (userId) => _base.getByUser(userId);

/** 🔄 Actualizar estado de lead */
export const updateMarketingLeadStatus = (projectCode, status, notes) => _base.updateStatus(projectCode, status, notes);

/** 📅 Agendar reunión */
export const scheduleMarketingMeeting = (projectCode, meetingDate) => _base.scheduleMeeting(projectCode, meetingDate);

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

/** 📋 Obtener leads por tipo de proyecto */
export const getMarketingLeadsByType = (projectType) => _base.getByType('project_type', projectType);

function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeLeadName(value) {
  const name = String(value || '').trim();
  return name ? name.slice(0, 120) : 'Sin nombre';
}

function buildAutoProjectCode(normalizedPhone) {
  const fingerprint = createHash('sha256')
    .update(normalizedPhone)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
  return `MKT-WS-${fingerprint}`;
}

/**
 * 🎯 Captura automática de lead de marketing desde conversación con Enzo.
 *
 * Se invoca en cada turno de conversación con Enzo (activeAgent === 'ENZO').
 * Si detecta intención de servicio (keywords), crea/actualiza un lead en
 * marketing_leads de forma idempotente por user_phone. Así un prospecto
 * queda registrado en el dashboard aunque nunca llegue a #PROCESS_FORM.
 *
 * Excluye el teléfono de Diego/admin (no son leads reales).
 *
 * @param {string} userPhone  - Teléfono del prospecto
 * @param {string} userName   - Nombre conocido (o 'Sin nombre')
 * @param {string} messageText - Texto del mensaje del usuario
 * @returns {Promise<{id:string, created?:boolean, updated?:boolean}|null>}
 */
export async function captureEnzoLeadFromKeywords(userPhone, userName, messageText) {
  // 🚫 Excluir admin / Diego — no son leads reales
  const phone = String(userPhone || '').trim();
  const norm = normalizePhoneDigits(phone);
  const adminNorm = normalizePhoneDigits(process.env.ADMIN_PHONE);
  const diegoNorm = normalizePhoneDigits(process.env.DIEGO_PERSONAL_PHONE);
  if (!norm || (adminNorm && norm === adminNorm) || (diegoNorm && norm === diegoNorm)) {
    return null;
  }

  // Keywords de intención de servicio (marketing / IA / software)
  const ENZO_KEYWORDS = [
    'agente virtual', 'agente ia', 'chatbot', 'bot', 'automatizar', 'automatización', 'automatizacion',
    'marketing', 'campaña', 'campania', 'meta ads', 'google ads', 'publicidad', 'redes sociales',
    'software', 'sistema', 'aplicación', 'aplicacion', 'app', 'página web', 'pagina web', 'landing',
    'inteligencia artificial', 'crm', 'pos', 'dashboard', 'cotización', 'cotizacion', 'cotizar',
    'presupuesto', 'proyecto', 'lead', 'leads', 'vender', 'ventas', 'captar', 'captación', 'captacion'
  ];
  const textLower = (messageText || '').toLowerCase();
  const matched = ENZO_KEYWORDS.filter(kw => textLower.includes(kw));
  if (matched.length === 0) return null; // sin señal de servicio → no crear lead

  try {
    await databaseService.ensureInitialized();

    const existing = await databaseService.get(
      'SELECT id, project_code FROM marketing_leads WHERE user_phone = $1 ORDER BY created_at DESC LIMIT 1',
      [phone]
    );

    if (existing) {
      await databaseService.run(
        `UPDATE marketing_leads SET updated_at = CURRENT_TIMESTAMP WHERE user_phone = $1`,
        [phone]
      );
      console.log('[ENZO-CAPTURE] 🔄 Lead existente actualizado');
      return { id: existing.id, updated: true };
    }

    const id = uuidv4();
    const projectCode = buildAutoProjectCode(norm);
    const clientName = normalizeLeadName(userName);
    const description = `Capturado automáticamente desde conversación con Enzo. Keywords: ${matched.slice(0, 8).join(', ')}`;

    const saved = await databaseService.get(
      `INSERT INTO marketing_leads (
        id, project_code, user_phone, project_type,
        company, client_name, email, phone,
        budget_range, urgency, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (project_code) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, project_code`,
      [
        id, projectCode, phone, 'Consulta inicial',
        null, clientName, null, phone,
        'Por definir', 'Normal', description, 'pending'
      ]
    );

    const savedId = saved?.id || id;
    const savedProjectCode = saved?.project_code || projectCode;
    const created = savedId === id;
    console.log(created ? '[ENZO-CAPTURE] ✅ Nuevo lead capturado' : '[ENZO-CAPTURE] 🔄 Lead existente actualizado');
    return created
      ? { id: savedId, projectCode: savedProjectCode, created: true }
      : { id: savedId, projectCode: savedProjectCode, updated: true };
  } catch (err) {
    console.warn('[ENZO-CAPTURE] ⚠️ Error capturando lead (no crítico):', err.message);
    return null;
  }
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
  getUrgentMarketingLeads,
  captureEnzoLeadFromKeywords,
  findLeadsForEnzoD1Followup,
  findLeadsForEnzoD3Followup,
  findLeadsForEnzoD7Followup,
  markEnzoFollowupSent
};

/**
 * 📅 D+1 (~24h): Leads con propuesta enviada hace ~24h sin followup D+1
 */
export async function findLeadsForEnzoD1Followup() {
  await databaseService.ensureInitialized();
  return await databaseService.all(`
    SELECT id, user_phone, phone, client_name, email, project_type, proposal_amount,
           project_code, proposal_sent_at
    FROM marketing_leads
    WHERE status IN ('proposal_sent', 'negotiating')
      AND followup_d1_sent_at IS NULL
      AND proposal_sent_at IS NOT NULL
      AND proposal_sent_at <= NOW() - INTERVAL '24 hours'
      AND proposal_sent_at >= NOW() - INTERVAL '72 hours'
    ORDER BY proposal_sent_at ASC
    LIMIT 30
  `);
}

/**
 * 📅 D+3 (~72h): Leads con propuesta que no respondieron a D+1
 */
export async function findLeadsForEnzoD3Followup() {
  await databaseService.ensureInitialized();
  return await databaseService.all(`
    SELECT id, user_phone, phone, client_name, email, project_type, proposal_amount,
           project_code, proposal_sent_at
    FROM marketing_leads
    WHERE status IN ('proposal_sent', 'negotiating')
      AND followup_d1_sent_at IS NOT NULL
      AND followup_d3_sent_at IS NULL
      AND proposal_sent_at IS NOT NULL
      AND proposal_sent_at <= NOW() - INTERVAL '72 hours'
      AND proposal_sent_at >= NOW() - INTERVAL '168 hours'
    ORDER BY proposal_sent_at ASC
    LIMIT 30
  `);
}

/**
 * 📅 D+7 (7 días): Último intento — leads que no respondieron a D+3
 */
export async function findLeadsForEnzoD7Followup() {
  await databaseService.ensureInitialized();
  return await databaseService.all(`
    SELECT id, user_phone, phone, client_name, email, project_type, proposal_amount,
           project_code, proposal_sent_at
    FROM marketing_leads
    WHERE status IN ('proposal_sent', 'negotiating')
      AND followup_d3_sent_at IS NOT NULL
      AND followup_d7_sent_at IS NULL
      AND proposal_sent_at IS NOT NULL
      AND DATE(proposal_sent_at) = CURRENT_DATE - INTERVAL '7 days'
    ORDER BY proposal_sent_at ASC
    LIMIT 30
  `);
}

/**
 * ✅ Marcar followup Enzo como enviado
 * @param {string} leadId
 * @param {'d1'|'d3'|'d7'} day
 */
export async function markEnzoFollowupSent(leadId, day) {
  await databaseService.ensureInitialized();
  const col = `followup_${day}_sent_at`;
  await databaseService.run(
    `UPDATE marketing_leads SET ${col} = NOW() WHERE id = $1`,
    [leadId]
  );
}
