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
import { sendEmail } from './email.js';
import { generateFollowUp24hEmail, generateFollowUp3dEmail, generateVisitReminderFollowUpEmail } from './email-templates-paula.js';
import { getUserPreferredLanguage } from '../perfiles-interacciones/memoria-sqlite.js';

// ─── FOLLOW-UP 24H POST-BROCHURE ──────────────────────────────────────────────

/**
 * Encuentra leads que recibieron brochure hace ~24h y no han avanzado de 'pending'
 */
async function findLeadsFor24hBrochureFollowUp() {
  try {
    await databaseService.initialize();
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
    await databaseService.initialize();
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
    await databaseService.initialize();
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
    await databaseService.initialize();
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
    await databaseService.initialize();
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
      const lang24h = await getUserPreferredLanguage(lead.phone) || 'es';
      const BROCHURE_MSG = {
        es: `@paula\nHola ${firstName} 👋\n\n¿Pudiste revisar el brochure de *${prop}* que te envié? 📧\n\nSi tienes alguna pregunta sobre la propiedad, financiamiento o el proceso de compra, estoy aquí para ayudarte.\n\n¿Te gustaría agendar una *visita presencial* para conocerla? 🏡`,
        en: `@paula\nHi ${firstName} 👋\n\nWere you able to review the brochure for *${prop}* I sent you? 📧\n\nIf you have any questions about the property, financing or the buying process, I'm here to help.\n\nWould you like to schedule an *in-person visit*? 🏡`,
        fr: `@paula\nBonjour ${firstName} 👋\n\nAvez-vous pu consulter la brochure de *${prop}* que je vous ai envoyée? 📧\n\nSi vous avez des questions sur le bien, le financement ou le processus d'achat, je suis là.\n\nSouhaitez-vous programmer une *visite en personne*? 🏡`,
        it: `@paula\nCiao ${firstName} 👋\n\nHai potuto vedere il brochure di *${prop}* che ti ho inviato? 📧\n\nSe hai domande sulla proprietà, il finanziamento o il processo d'acquisto, sono qui per aiutarti.\n\nVorresti programmare una *visita di persona*? 🏡`,
        pt: `@paula\nOlá ${firstName} 👋\n\nConseguiu ver o brochure de *${prop}* que lhe enviei? 📧\n\nSe tiver perguntas sobre o imóvel, financiamento ou processo de compra, estou aqui para ajudar.\n\nGostaria de agendar uma *visita presencial*? 🏡`,
        qu: `@paula\nNapaykullayki ${firstName} 👋\n\n¿Pudiste revisar el brochure de *${prop}*? 📧\n\nEstoy aquí para ayudarte. ¿Quieres visitar la propiedad? 🏡`,
      };
      const msg = BROCHURE_MSG[lang24h] ?? BROCHURE_MSG.es;
      
      await enviarWhatsApp(lead.phone, msg);

      // Email follow-up (si tiene email)
      if (lead.email) {
        try {
          const { subject, html } = generateFollowUp24hEmail({
            clientName: lead.client_name,
            propertyType: lead.property_type,
            operationType: lead.operation_type,
            preferredZone: lead.preferred_zone,
            budgetRange: lead.budget_range
          }, lang24h);
          await sendEmail({ to: lead.email, subject, html, agent: 'paula', refId: `followup24h-${lead.id}` });
          console.log(`[PAULA-FOLLOWUP] 📧 Email 24h enviado a ${lead.email}`);
        } catch (emailErr) {
          console.error(`[PAULA-FOLLOWUP] ⚠️ Email 24h falló para ${lead.client_name}:`, emailErr.message);
        }
      }

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
      const lang3d = await getUserPreferredLanguage(lead.phone) || 'es';
      const REENGAGEMENT_MSG = {
        es: `@paula\nHola ${firstName} 🏡\n\nTe escribo porque tengo algunas *opciones nuevas* en *${zone}* que podrían interesarte.\n\n¿Sigues buscando propiedad? Si tu presupuesto o preferencias cambiaron, cuéntame y te busco algo que se ajuste mejor 🎯\n\nEstoy a una respuesta de distancia 🤝`,
        en: `@paula\nHi ${firstName} 🏡\n\nI'm reaching out because I have some *new options* in *${zone}* that might interest you.\n\nAre you still looking for a property? If your budget or preferences changed, let me know 🎯\n\nOne message away 🤝`,
        fr: `@paula\nBonjour ${firstName} 🏡\n\nJe vous contacte car j'ai de nouvelles *options* dans *${zone}* qui pourraient vous intéresser.\n\nCherchez-vous toujours un bien? Si votre budget ou préférences ont changé, dites-le moi 🎯\n\nÀ une réponse près 🤝`,
        it: `@paula\nCiao ${firstName} 🏡\n\nTi scrivo perché ho alcune *nuove opzioni* a *${zone}* che potrebbero interessarti.\n\nStai ancora cercando? Se il budget o le preferenze sono cambiate, dimmelo 🎯\n\nA un messaggio di distanza 🤝`,
        pt: `@paula\nOlá ${firstName} 🏡\n\nEstou a contactá-lo porque tenho algumas *novas opções* em *${zone}* que podem interessar-lhe.\n\nAinda está à procura? Se o orçamento ou preferências mudaram, me avise 🎯\n\nA uma resposta de distância 🤝`,
        qu: `@paula\nNapaykullayki ${firstName} 🏡\n\nKay *${zone}*-pi musuq opciones tiyanña.\n\n¿Aún buscas? Cuéntame y te ayudo 🎯`,
      };
      const msg = REENGAGEMENT_MSG[lang3d] ?? REENGAGEMENT_MSG.es;
      
      await enviarWhatsApp(lead.phone, msg);

      // Email follow-up (si tiene email)
      if (lead.email) {
        try {
          const { subject, html } = generateFollowUp3dEmail({
            clientName: lead.client_name,
            propertyType: lead.property_type,
            operationType: lead.operation_type,
            preferredZone: lead.preferred_zone
          }, lang3d);
          await sendEmail({ to: lead.email, subject, html, agent: 'paula', refId: `followup3d-${lead.id}` });
          console.log(`[PAULA-FOLLOWUP] 📧 Email 3d enviado a ${lead.email}`);
        } catch (emailErr) {
          console.error(`[PAULA-FOLLOWUP] ⚠️ Email 3d falló para ${lead.client_name}:`, emailErr.message);
        }
      }

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
      const langVisit = await getUserPreferredLanguage(visit.client_phone) || 'es';
      const addrFallback = { es: 'Te envío la ubicación exacta por aquí', en: "I'll send you the exact location", fr: "Je vous envoie l'adresse exacte", it: "Ti invio l'indirizzo esatto", pt: 'Envio-lhe o endereço exato', qu: 'Te mando la dirección' }[langVisit] ?? 'Te envío la ubicación exacta por aquí';
      const addr = visit.property_address || addrFallback;
      const VISIT_REMINDER = {
        es: `@paula\nHola ${firstName} 🏡\n\n¡Mañana es tu visita a *${visit.property_name}*!\n\n📅 *Fecha:* Mañana\n⏰ *Hora:* ${timeStr}\n📍 *Dirección:* ${addr}\n\n¿Confirmamos para mañana? Responde *SÍ* para confirmar o avísame si necesitas reagendar 🙂`,
        en: `@paula\nHi ${firstName} 🏡\n\nTomorrow is your visit to *${visit.property_name}*!\n\n📅 *Date:* Tomorrow\n⏰ *Time:* ${timeStr}\n📍 *Address:* ${addr}\n\nShall we confirm for tomorrow? Reply *YES* to confirm or let me know if you need to reschedule 🙂`,
        fr: `@paula\nBonjour ${firstName} 🏡\n\nDemain c'est votre visite de *${visit.property_name}*!\n\n📅 *Date:* Demain\n⏰ *Heure:* ${timeStr}\n📍 *Adresse:* ${addr}\n\nOn confirme pour demain? Répondez *OUI* pour confirmer ou prévenez-moi si vous devez reporter 🙂`,
        it: `@paula\nCiao ${firstName} 🏡\n\nDomani è la tua visita a *${visit.property_name}*!\n\n📅 *Data:* Domani\n⏰ *Ora:* ${timeStr}\n📍 *Indirizzo:* ${addr}\n\nConfermiamo per domani? Rispondi *SÌ* per confermare o avvisami se devi rimandare 🙂`,
        pt: `@paula\nOlá ${firstName} 🏡\n\nAmanhã é a sua visita a *${visit.property_name}*!\n\n📅 *Data:* Amanhã\n⏰ *Hora:* ${timeStr}\n📍 *Endereço:* ${addr}\n\nConfirmamos para amanhã? Responda *SIM* para confirmar ou avise-me se precisar reagendar 🙂`,
        qu: `@paula\nNapaykullayki ${firstName} 🏡\n\n¡Mañana es tu visita a *${visit.property_name}*!\n\n📅 Mañana · ⏰ ${timeStr}\n📍 ${addr}\n\n¿Confirmamos? 🙂`,
      };
      const msg = VISIT_REMINDER[langVisit] ?? VISIT_REMINDER.es;
      
      await enviarWhatsApp(visit.client_phone, msg);

      // Email reminder (si tiene email)
      if (visit.client_email) {
        try {
          const { subject, html } = generateVisitReminderFollowUpEmail({
            clientName: visit.client_name,
            propertyName: visit.property_name,
            propertyAddress: visit.property_address,
            date: visit.date,
            startTime: visit.start_time
          }, langVisit);
          await sendEmail({ to: visit.client_email, subject, html, agent: 'paula', refId: `visitreminder-${visit.id}` });
          console.log(`[PAULA-FOLLOWUP] 📧 Email reminder enviado a ${visit.client_email}`);
        } catch (emailErr) {
          console.error(`[PAULA-FOLLOWUP] ⚠️ Email reminder falló para ${visit.client_name}:`, emailErr.message);
        }
      }

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
