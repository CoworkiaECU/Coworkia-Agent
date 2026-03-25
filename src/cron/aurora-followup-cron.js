/**
 * 📞 aurora-followup-cron.js — Follow-ups automáticos post-reserva
 *
 * Dos crons:
 * 1. +1h post-reserva: Ejecuta cada 15 minutos, busca reservas confirmadas
 *    hace ~1 hora y envía mensaje de seguimiento inmediato.
 * 2. D+7 re-booking: Ejecuta diariamente a las 10:00 AM, busca reservas
 *    completadas hace 7 días y envía invitación a re-agendar.
 *
 * Uso: startAuroraFollowupCrons() desde index.js en el boot.
 */

import { CronJob } from 'cron';
import databaseService from '../database/database.js';
import axios from 'axios';

const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE || process.env.WASSENGER_DEVICE_ID;

// Helper para enviar mensajes de WhatsApp
async function sendWhatsApp(phone, message) {
  if (!WASSENGER_TOKEN || !WASSENGER_DEVICE) {
    console.warn('[AURORA-FOLLOWUP] Token o Device no configurado');
    return { ok: false, error: 'NO_WASSENGER_CONFIG' };
  }

  try {
    await axios.post(
      'https://api.wassenger.com/v1/messages',
      {
        phone,
        message,
        device: WASSENGER_DEVICE
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': WASSENGER_TOKEN
        },
        timeout: 8000
      }
    );
    return { ok: true };
  } catch (error) {
    console.error('[AURORA-FOLLOWUP] Error enviando WhatsApp:', error.message);
    return { ok: false, error: error.message };
  }
}

// ─── Follow-up +1h post-reserva ───────────────────────────────────────────────

async function sendOneHourFollowups() {
  console.log('[AURORA-FOLLOWUP] ⏰ Buscando reservas para follow-up +1h...');
  
  try {
    await databaseService.ensureInitialized();

    // Buscar reservas confirmadas hace entre 55-65 minutos (ventana de 10 min)
    // que NO hayan recibido el follow-up todavía
    const reservationsToFollowup = await databaseService.all(`
      SELECT 
        id, 
        user_phone, 
        service_type, 
        date, 
        start_time,
        guest_count,
        total_price
      FROM reservations
      WHERE status = 'confirmed'
        AND confirmed_at IS NOT NULL
        AND followup_1h_sent_at IS NULL
        AND confirmed_at >= NOW() - INTERVAL '65 minutes'
        AND confirmed_at <= NOW() - INTERVAL '55 minutes'
      ORDER BY confirmed_at ASC
      LIMIT 20
    `);

    if (reservationsToFollowup.length === 0) {
      console.log('[AURORA-FOLLOWUP] ℹ️ No hay reservas para follow-up +1h');
      return;
    }

    console.log(`[AURORA-FOLLOWUP] 📨 Enviando ${reservationsToFollowup.length} follow-ups +1h...`);

    let sent = 0;
    let failed = 0;

    for (const reservation of reservationsToFollowup) {
      try {
        const serviceLabel = 
          reservation.service_type === 'hot_desk' ? 'Hot Desk' :
          reservation.service_type === 'private_office' ? 'Oficina Privada' :
          reservation.service_type === 'meeting_room' ? 'Sala de Reuniones' :
          reservation.service_type;

        const message = `¡Hola! 👋

Tu reserva de *${serviceLabel}* para el ${formatDate(reservation.date)} a las ${reservation.start_time} está confirmada ✅

¿Todo listo para tu visita? Si tienes alguna pregunta o necesitas cambiar algo, estoy aquí para ayudarte 😊

📍 *Coworkia Quito*
Av. 12 de Octubre N24-562 y Cordero

¡Te esperamos!`;

        await sendWhatsApp(reservation.user_phone, message);

        // Marcar como enviado
        await databaseService.run(
          `UPDATE reservations 
           SET followup_1h_sent_at = NOW() 
           WHERE id = $1`,
          [reservation.id]
        );

        sent++;
        console.log(`[AURORA-FOLLOWUP] ✅ Follow-up enviado a ${reservation.user_phone}`);

        // Delay de 2 segundos entre mensajes para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failed++;
        console.error(`[AURORA-FOLLOWUP] ❌ Error enviando a ${reservation.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-FOLLOWUP] 📊 Resumen +1h: ${sent} enviados, ${failed} fallidos`);

  } catch (error) {
    console.error('[AURORA-FOLLOWUP] ❌ Error en cron +1h:', error.message);
  }
}

// ─── Follow-up D+7 re-booking ─────────────────────────────────────────────────

async function sendRebookingReminders() {
  console.log('[AURORA-REBOOK] 🔄 Buscando reservas para re-booking D+7...');
  
  try {
    await databaseService.ensureInitialized();

    // Buscar reservas completadas hace exactamente 7 días
    // que NO hayan recibido el reminder todavía
    const reservationsToRebook = await databaseService.all(`
      SELECT 
        id, 
        user_phone, 
        service_type, 
        date, 
        start_time,
        guest_count
      FROM reservations
      WHERE status = 'confirmed'
        AND date = CURRENT_DATE - INTERVAL '7 days'
        AND rebook_reminder_sent_at IS NULL
      ORDER BY date ASC
      LIMIT 30
    `);

    if (reservationsToRebook.length === 0) {
      console.log('[AURORA-REBOOK] ℹ️ No hay reservas para re-booking D+7');
      return;
    }

    console.log(`[AURORA-REBOOK] 📨 Enviando ${reservationsToRebook.length} invitaciones de re-booking...`);

    let sent = 0;
    let failed = 0;

    for (const reservation of reservationsToRebook) {
      try {
        const serviceLabel = 
          reservation.service_type === 'hot_desk' ? 'Hot Desk' :
          reservation.service_type === 'private_office' ? 'Oficina Privada' :
          reservation.service_type === 'meeting_room' ? 'Sala de Reuniones' :
          reservation.service_type;

        const message = `¡Hola! 😊

Han pasado 7 días desde tu última visita a *Coworkia*. ¡Fue genial tenerte con nosotros! 

¿Te gustaría volver a reservar un espacio? Tenemos disponibilidad esta semana:

📅 ${serviceLabel}
💼 Hot Desk desde $4/hora
🎯 Oficina Privada desde $15/hora
👥 Sala de Reuniones desde $8/hora

Solo dime qué día y hora te vienen mejor y reservo para ti. ¿Qué te parece? 🚀`;

        await sendWhatsApp(reservation.user_phone, message);

        // Marcar como enviado
        await databaseService.run(
          `UPDATE reservations 
           SET rebook_reminder_sent_at = NOW() 
           WHERE id = $1`,
          [reservation.id]
        );

        sent++;
        console.log(`[AURORA-REBOOK] ✅ Re-booking enviado a ${reservation.user_phone}`);

        // Delay de 3 segundos entre mensajes
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        failed++;
        console.error(`[AURORA-REBOOK] ❌ Error enviando a ${reservation.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-REBOOK] 📊 Resumen D+7: ${sent} enviados, ${failed} fallidos`);

  } catch (error) {
    console.error('[AURORA-REBOOK] ❌ Error en cron D+7:', error.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
}

// ─── Inicialización ───────────────────────────────────────────────────────────

export function startAuroraFollowupCrons() {
  // Cron 1: Follow-up +1h — cada 15 minutos
  const followupJob = new CronJob(
    '*/15 * * * *', // Cada 15 minutos
    sendOneHourFollowups,
    null,
    true,
    'America/Guayaquil'
  );

  // Cron 2: Re-booking D+7 — diario a las 10:00 AM Ecuador
  const rebookJob = new CronJob(
    '0 10 * * *', // 10:00 AM todos los días
    sendRebookingReminders,
    null,
    true,
    'America/Guayaquil'
  );

  console.log('[AURORA-FOLLOWUP] ✅ Cron de follow-up +1h configurado (cada 15 min)');
  console.log('[AURORA-REBOOK] ✅ Cron de re-booking D+7 configurado (10:00 AM Ecuador)');

  return { followupJob, rebookJob };
}
