/**
 * 🏡 PAULA — Servicio de Follow-Up Automático para Leads Inmobiliarios
 * 
 * Automatizaciones:
 * 1. 24h post-brochure: "¿Pudiste revisar el brochure?"
 * 2. 3 días sin respuesta: "Tengo opciones nuevas para ti"
 * 3. Recordatorio 24h antes de visita agendada
 */

import databaseService from '../database/database.js';
import { enviarWhatsApp } from '../express-servidor/endpoints-api/wassenger.js';
import { isWithinAllowedHours } from './follow-up-service.js';

// ─── FOLLOW-UP 24H POST-BROCHURE ──────────────────────────────────────────────

/**
 * Encuentra leads que recibieron brochure hace ~24h y no han avanzado de 'pending'
 */
async function findLeadsFor24hBrochureFollowUp() {
  try {
    await databaseService.ensureInitialized();
    return await databaseService.all(`
      SELECT id, client_name, phone, email, operation_type, property_type, 
             preferred_zone, budget_range, requirements, created_at
      FROM real_estate_leads
      WHERE status = 'pending'
        AND requirements::text LIKE '%brochureEnviado%'
        AND requirements::text NOT LIKE '%followup24hSent%'
        AND phone IS NOT NULL
        AND phone != ''
        AND created_at <= NOW() - INTERVAL '20 hours'
        AND created_at >= NOW() - INTERVAL '48 hours'
    `) || [];
  } catch (err) {
    console.error('[PAULA-FOLLOWUP] ❌ Error buscando leads 24h:', err.message);
    return [];
  }
}

/**
 * Encuentra leads que recibieron brochure hace ~3 días y siguen en 'pending' o 'searching'
 */
async function findLeadsFor3dFollowUp() {
  try {
    await databaseService.ensureInitialized();
    return await databaseService.all(`
      SELECT id, client_name, phone, email, operation_type, property_type,
             preferred_zone, budget_range, requirements, created_at
      FROM real_estate_leads
      WHERE status IN ('pending', 'searching')
        AND requirements::text LIKE '%brochureEnviado%'
        AND requirements::text LIKE '%followup24hSent%'
        AND requirements::text NOT LIKE '%followup3dSent%'
        AND phone IS NOT NULL
        AND phone != ''
        AND created_at <= NOW() - INTERVAL '3 days'
        AND created_at >= NOW() - INTERVAL '7 days'
    `) || [];
  } catch (err) {
    console.error('[PAULA-FOLLOWUP] ❌ Error buscando leads 3d:', err.message);
    return [];
  }
}

/**
 * Encuentra visitas agendadas para mañana (recordatorio 24h antes)
 */
async function findVisitsForTomorrowReminder() {
  try {
    await databaseService.ensureInitialized();
    return await databaseService.all(`
      SELECT id, client_name, client_phone, client_email,
             property_name, property_address, date, start_time, notes
      FROM property_visits
      WHERE status = 'confirmed'
        AND date = CURRENT_DATE + INTERVAL '1 day'
        AND (notes IS NULL OR notes NOT LIKE '%reminder24hSent%')
        AND client_phone IS NOT NULL
    `) || [];
  } catch (err) {
    console.error('[PAULA-FOLLOWUP] ❌ Error buscando visitas mañana:', err.message);
    return [];
  }
}

// ─── MARCADORES ───────────────────────────────────────────────────────────────

async function markFollowupSent(leadId, flagKey) {
  try {
    await databaseService.ensureInitialized();
    // Agregar flag al JSONB requirements
    await databaseService.run(`
      UPDATE real_estate_leads 
      SET requirements = requirements || $1::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify({ [flagKey]: new Date().toISOString() }), leadId]);
  } catch (err) {
    console.error(`[PAULA-FOLLOWUP] ❌ Error marcando ${flagKey}:`, err.message);
  }
}

async function markVisitReminderSent(visitId) {
  try {
    await databaseService.ensureInitialized();
    const newNotes = 'reminder24hSent:' + new Date().toISOString();
    await databaseService.run(`
      UPDATE property_visits 
      SET notes = COALESCE(notes, '') || $1
      WHERE id = $2
    `, [' | ' + newNotes, visitId]);
  } catch (err) {
    console.error('[PAULA-FOLLOWUP] ❌ Error marcando reminder visita:', err.message);
  }
}

// ─── PROCESADORES ─────────────────────────────────────────────────────────────

/**
 * 🏡 Procesa todos los follow-ups de Paula
 * Llamado desde cron-scheduler.js
 */
export async function processPaulaFollowUps() {
  const results = { sent24h: 0, sent3d: 0, visitReminders: 0, skipped: 0 };

  if (!isWithinAllowedHours()) {
    console.log('[PAULA-FOLLOWUP] ⏰ Fuera de horario permitido (6am-10pm Ecuador)');
    return results;
  }

  // 1. Follow-up 24h post-brochure
  const leads24h = await findLeadsFor24hBrochureFollowUp();
  for (const lead of leads24h) {
    try {
      const firstName = (lead.client_name || 'Hola').split(' ')[0];
      const prop = lead.property_type || 'la propiedad';
      const msg = `@paula\nHola ${firstName} 👋\n\n¿Pudiste revisar el brochure de *${prop}* que te envié? 📧\n\nSi tienes alguna pregunta sobre la propiedad, financiamiento o el proceso de compra, estoy aquí para ayudarte.\n\n¿Te gustaría agendar una *visita presencial* para conocerla? 🏡`;
      
      await enviarWhatsApp(lead.phone, msg);
      await markFollowupSent(lead.id, 'followup24hSent');
      results.sent24h++;
      console.log(`[PAULA-FOLLOWUP] ✅ 24h follow-up enviado a ${lead.client_name}`);
      await new Promise(r => setTimeout(r, 1500)); // rate limit
    } catch (err) {
      console.error(`[PAULA-FOLLOWUP] ❌ Error 24h ${lead.client_name}:`, err.message);
      results.skipped++;
    }
  }

  // 2. Follow-up 3 días (soft re-engagement)
  const leads3d = await findLeadsFor3dFollowUp();
  for (const lead of leads3d) {
    try {
      const firstName = (lead.client_name || 'Hola').split(' ')[0];
      const zone = lead.preferred_zone || 'tu zona de interés';
      const msg = `@paula\nHola ${firstName} 🏡\n\nTe escribo porque tengo algunas *opciones nuevas* en *${zone}* que podrían interesarte.\n\n¿Sigues buscando propiedad? Si tu presupuesto o preferencias cambiaron, cuéntame y te busco algo que se ajuste mejor 🎯\n\nEstoy a una respuesta de distancia 🤝`;
      
      await enviarWhatsApp(lead.phone, msg);
      await markFollowupSent(lead.id, 'followup3dSent');
      results.sent3d++;
      console.log(`[PAULA-FOLLOWUP] ✅ 3d follow-up enviado a ${lead.client_name}`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[PAULA-FOLLOWUP] ❌ Error 3d ${lead.client_name}:`, err.message);
      results.skipped++;
    }
  }

  // 3. Recordatorio 24h antes de visita
  const visits = await findVisitsForTomorrowReminder();
  for (const visit of visits) {
    try {
      const firstName = (visit.client_name || 'Hola').split(' ')[0];
      const timeStr = visit.start_time || '10:00';
      const msg = `@paula\nHola ${firstName} 🏡\n\n¡Mañana es tu visita a *${visit.property_name}*!\n\n📅 *Fecha:* Mañana\n⏰ *Hora:* ${timeStr}\n📍 *Dirección:* ${visit.property_address || 'Te envío la ubicación exacta por aquí'}\n\n¿Confirmamos para mañana? Responde *SÍ* para confirmar o avísame si necesitas reagendar 🙂`;
      
      await enviarWhatsApp(visit.client_phone, msg);
      await markVisitReminderSent(visit.id);
      results.visitReminders++;
      console.log(`[PAULA-FOLLOWUP] ✅ Reminder visita enviado a ${visit.client_name}`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[PAULA-FOLLOWUP] ❌ Error reminder ${visit.client_name}:`, err.message);
      results.skipped++;
    }
  }

  return results;
}
