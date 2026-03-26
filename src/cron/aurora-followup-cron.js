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
import { dispatchHttpRequest } from '../servicios/external-dispatcher.js';
import { sendEmail } from '../servicios/email.js';
import { buildEmailTemplate } from '../servicios/email-template-system.js';

const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE || process.env.WASSENGER_DEVICE_ID;

// Helper para enviar mensajes de WhatsApp
async function sendWhatsApp(phone, message) {
  if (!WASSENGER_TOKEN || !WASSENGER_DEVICE) {
    console.warn('[AURORA-FOLLOWUP] Token o Device no configurado');
    return { ok: false, error: 'NO_WASSENGER_CONFIG' };
  }

  try {
    await dispatchHttpRequest({
      url: 'https://api.wassenger.com/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': WASSENGER_TOKEN
      },
      body: JSON.stringify({
        phone,
        message,
        device: WASSENGER_DEVICE
      }),
      circuitId: 'wassenger:messages',
      timeoutMs: 8000,
      maxRetries: 2
    });
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

    // Buscar reservas completadas hace 7-9 días (ventana de 3 días para no perder ninguna)
    // Fix v1152: antes usaba = exacto y perdía reservas de 8+ días
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
        AND date BETWEEN CURRENT_DATE - INTERVAL '9 days' AND CURRENT_DATE - INTERVAL '7 days'
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

// ─── Follow-up D+1 post-reserva (engagement + feedback) ──────────────────────

async function sendD1Followups() {
  console.log('[AURORA-D1] 📨 Buscando reservas para follow-up D+1...');
  
  try {
    await databaseService.ensureInitialized();

    const reservations = await databaseService.all(`
      SELECT 
        r.id, r.user_phone, r.service_type, r.date, r.start_time,
        u.name AS user_name, u.email AS user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status IN ('confirmed', 'completed')
        AND r.date = CURRENT_DATE - INTERVAL '1 day'
        AND r.followup_d1_sent_at IS NULL
      ORDER BY r.date ASC
      LIMIT 30
    `);

    if (reservations.length === 0) {
      console.log('[AURORA-D1] ℹ️ No hay reservas para follow-up D+1');
      return;
    }

    console.log(`[AURORA-D1] 📨 Enviando ${reservations.length} follow-ups D+1...`);
    let sent = 0, failed = 0;

    for (const r of reservations) {
      try {
        const serviceLabel = r.service_type === 'hot_desk' ? 'Hot Desk'
          : r.service_type === 'meeting_room' ? 'Sala de Reuniones'
          : r.service_type === 'private_office' ? 'Oficina Privada' : r.service_type;
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';

        // WhatsApp
        const serviceQuestion = r.service_type === 'meeting_room'
          ? '¿Tu reunión fue un éxito? 🎯'
          : '¿Tuviste un día productivo? 💪';

        const waMessage = `¡Hola ${firstName}! 😊

Ayer disfrutaste de tu *${serviceLabel}* en Coworkia. ${serviceQuestion}

Tu feedback nos ayuda a mejorar. ¿Qué calificación nos das del 1 al 5? ⭐

Y si quieres volver pronto, solo dime y reservo para ti 📅`;

        await sendWhatsApp(r.user_phone, waMessage);

        // Email (si tiene)
        if (r.user_email) {
          const html = buildEmailTemplate('AURORA', 'D1', {
            nombre: r.user_name || firstName,
            servicio: serviceLabel,
            dia: formatDate(r.date)
          });
          await sendEmail({
            to: r.user_email,
            subject: `¿Cómo estuvo tu experiencia en Coworkia? 🌟`,
            html
          });
        }

        await databaseService.run(
          `UPDATE reservations SET followup_d1_sent_at = NOW() WHERE id = $1`,
          [r.id]
        );

        sent++;
        console.log(`[AURORA-D1] ✅ Follow-up D+1 enviado a ${r.user_phone}`);
        await new Promise(resolve => setTimeout(resolve, 2500));

      } catch (error) {
        failed++;
        console.error(`[AURORA-D1] ❌ Error enviando a ${r.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-D1] 📊 Resumen D+1: ${sent} enviados, ${failed} fallidos`);
  } catch (error) {
    console.error('[AURORA-D1] ❌ Error en cron D+1:', error.message);
  }
}

// ─── Follow-up D+3 FOMO (upselling suave) ────────────────────────────────────

async function sendD3Followups() {
  console.log('[AURORA-D3] 🔥 Buscando reservas para follow-up D+3 FOMO...');
  
  try {
    await databaseService.ensureInitialized();

    const reservations = await databaseService.all(`
      SELECT 
        r.id, r.user_phone, r.service_type, r.date, r.total_price,
        u.name AS user_name, u.email AS user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status IN ('confirmed', 'completed')
        AND r.date BETWEEN CURRENT_DATE - INTERVAL '4 days' AND CURRENT_DATE - INTERVAL '3 days'
        AND r.followup_d3_sent_at IS NULL
        AND r.followup_d1_sent_at IS NOT NULL
      ORDER BY r.date ASC
      LIMIT 30
    `);

    if (reservations.length === 0) {
      console.log('[AURORA-D3] ℹ️ No hay reservas para follow-up D+3');
      return;
    }

    console.log(`[AURORA-D3] 📨 Enviando ${reservations.length} follow-ups D+3 FOMO...`);
    let sent = 0, failed = 0;

    for (const r of reservations) {
      try {
        const serviceLabel = r.service_type === 'hot_desk' ? 'Hot Desk'
          : r.service_type === 'meeting_room' ? 'Sala de Reuniones'
          : r.service_type === 'private_office' ? 'Oficina Privada' : r.service_type;
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';
        const wasFree = parseFloat(r.total_price || 0) === 0;

        // WhatsApp — variaciones inteligentes
        let fomoLine;
        if (wasFree) {
          fomoLine = '🎁 Tu primera visita gratis ya pasó, pero tenemos *15% OFF* en tu siguiente reserva esta semana.';
        } else if (r.service_type === 'meeting_room') {
          fomoLine = '👥 ¿Tienes otra reunión pendiente? Salas disponibles esta semana con horarios flexibles.';
        } else {
          fomoLine = '💡 ¿Sabías que con una *Membresía Coworkia* ahorras hasta un 40%? Pregúntame por los planes.';
        }

        const waMessage = `¡Hola ${firstName}! 🚀

Han pasado 3 días desde tu visita a Coworkia. ¿Cuándo vuelves?

${fomoLine}

📊 *Esta semana en Coworkia:*
✅ WiFi premium · ☕ Café ilimitado · 🅿️ Parking gratis

Solo dime qué día y hora y reservo para ti 📅`;

        await sendWhatsApp(r.user_phone, waMessage);

        // Email (si tiene)
        if (r.user_email) {
          const html = buildEmailTemplate('AURORA', 'D3', {
            nombre: r.user_name || firstName,
            servicio: serviceLabel,
            wasFree
          });
          await sendEmail({
            to: r.user_email,
            subject: `¿Cuándo vuelves a Coworkia, ${firstName}? 🚀`,
            html
          });
        }

        await databaseService.run(
          `UPDATE reservations SET followup_d3_sent_at = NOW() WHERE id = $1`,
          [r.id]
        );

        sent++;
        console.log(`[AURORA-D3] ✅ Follow-up D+3 FOMO enviado a ${r.user_phone}`);
        await new Promise(resolve => setTimeout(resolve, 2500));

      } catch (error) {
        failed++;
        console.error(`[AURORA-D3] ❌ Error enviando a ${r.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-D3] 📊 Resumen D+3: ${sent} enviados, ${failed} fallidos`);
  } catch (error) {
    console.error('[AURORA-D3] ❌ Error en cron D+3:', error.message);
  }
}

// ─── Recordatorio Pre-Reserva 24h ────────────────────────────────────────────

async function sendReminder24h() {
  console.log('[AURORA-24H] 📅 Buscando reservas para recordatorio 24h...');
  
  try {
    await databaseService.ensureInitialized();

    const reservations = await databaseService.all(`
      SELECT 
        r.id, r.user_phone, r.service_type, r.date, r.start_time,
        u.name AS user_name, u.email AS user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status = 'confirmed'
        AND r.date = CURRENT_DATE + INTERVAL '1 day'
        AND r.reminder_24h_sent_at IS NULL
      ORDER BY r.start_time ASC
      LIMIT 30
    `);

    if (reservations.length === 0) {
      console.log('[AURORA-24H] ℹ️ No hay reservas para recordatorio 24h');
      return;
    }

    console.log(`[AURORA-24H] 📨 Enviando ${reservations.length} recordatorios 24h...`);
    let sent = 0, failed = 0;

    for (const r of reservations) {
      try {
        const serviceLabel = r.service_type === 'hot_desk' ? 'Hot Desk'
          : r.service_type === 'meeting_room' ? 'Sala de Reuniones'
          : r.service_type === 'private_office' ? 'Oficina Privada' : r.service_type;
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';

        // WhatsApp
        const waMessage = `¡Hola ${firstName}! 📅

Te recordamos que *mañana* a las *${r.start_time}* tienes tu reserva de *${serviceLabel}* en Coworkia.

📍 *Dirección:* Av. 12 de Octubre N24-562 y Cordero
🅿️ Estacionamiento disponible
☕ Café incluido

¿Todo listo? Si necesitas cancelar o cambiar la hora, escríbeme y te ayudo 😊`;

        await sendWhatsApp(r.user_phone, waMessage);

        // Email (si tiene)
        if (r.user_email) {
          const html = buildEmailTemplate('AURORA', 'REMINDER_24H', {
            nombre: r.user_name || firstName,
            servicio: serviceLabel,
            dia: formatDate(r.date),
            hora: r.start_time
          });
          await sendEmail({
            to: r.user_email,
            subject: `📅 Mañana a las ${r.start_time} te esperamos en Coworkia`,
            html
          });
        }

        await databaseService.run(
          `UPDATE reservations SET reminder_24h_sent_at = NOW() WHERE id = $1`,
          [r.id]
        );

        sent++;
        console.log(`[AURORA-24H] ✅ Recordatorio 24h enviado a ${r.user_phone}`);
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failed++;
        console.error(`[AURORA-24H] ❌ Error enviando a ${r.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-24H] 📊 Resumen 24h: ${sent} enviados, ${failed} fallidos`);
  } catch (error) {
    console.error('[AURORA-24H] ❌ Error en cron 24h:', error.message);
  }
}

// ─── Recordatorio Pre-Reserva 2h (solo WhatsApp) ─────────────────────────────

async function sendReminder2h() {
  console.log('[AURORA-2H] 🔔 Buscando reservas para recordatorio 2h...');
  
  try {
    await databaseService.ensureInitialized();

    const reservations = await databaseService.all(`
      SELECT 
        r.id, r.user_phone, r.service_type, r.date, r.start_time,
        u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status = 'confirmed'
        AND r.date = CURRENT_DATE
        AND r.start_time::time BETWEEN (NOW() + INTERVAL '1 hour 30 minutes')::time 
                                     AND (NOW() + INTERVAL '2 hours 30 minutes')::time
        AND r.reminder_2h_sent_at IS NULL
      ORDER BY r.start_time ASC
      LIMIT 20
    `);

    if (reservations.length === 0) {
      console.log('[AURORA-2H] ℹ️ No hay reservas para recordatorio 2h');
      return;
    }

    console.log(`[AURORA-2H] 📨 Enviando ${reservations.length} recordatorios 2h...`);
    let sent = 0, failed = 0;

    for (const r of reservations) {
      try {
        const serviceLabel = r.service_type === 'hot_desk' ? 'Hot Desk'
          : r.service_type === 'meeting_room' ? 'Sala de Reuniones'
          : r.service_type === 'private_office' ? 'Oficina Privada' : r.service_type;
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';

        const waMessage = `🔔 *¡Recordatorio!* ${firstName}

En *2 horas* te esperamos en Coworkia para tu *${serviceLabel}* a las *${r.start_time}*.

📍 Av. 12 de Octubre N24-562 y Cordero

¡Nos vemos pronto! 😊`;

        await sendWhatsApp(r.user_phone, waMessage);

        await databaseService.run(
          `UPDATE reservations SET reminder_2h_sent_at = NOW() WHERE id = $1`,
          [r.id]
        );

        sent++;
        console.log(`[AURORA-2H] ✅ Recordatorio 2h enviado a ${r.user_phone}`);
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failed++;
        console.error(`[AURORA-2H] ❌ Error enviando a ${r.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-2H] 📊 Resumen 2h: ${sent} enviados, ${failed} fallidos`);
  } catch (error) {
    console.error('[AURORA-2H] ❌ Error en cron 2h:', error.message);
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

  // Cron 3: Follow-up D+1 — diario a las 10:00 AM Ecuador
  const d1Job = new CronJob(
    '5 10 * * *', // 10:05 AM (5 min después de D+7 para no solapar)
    sendD1Followups,
    null,
    true,
    'America/Guayaquil'
  );

  // Cron 4: Follow-up D+3 FOMO — diario a las 14:00 PM Ecuador (tarde = FOMO)
  const d3Job = new CronJob(
    '0 14 * * *', // 2:00 PM todos los días
    sendD3Followups,
    null,
    true,
    'America/Guayaquil'
  );

  // Cron 5: Recordatorio 24h — diario a las 18:00 PM (tarde anterior)
  const reminder24hJob = new CronJob(
    '0 18 * * *', // 6:00 PM todos los días
    sendReminder24h,
    null,
    true,
    'America/Guayaquil'
  );

  // Cron 6: Recordatorio 2h — cada 30 min de 8AM a 6PM
  const reminder2hJob = new CronJob(
    '*/30 8-18 * * *', // Cada 30 min, solo horario laboral
    sendReminder2h,
    null,
    true,
    'America/Guayaquil'
  );

  console.log('[AURORA-FOLLOWUP] ✅ Cron de follow-up +1h configurado (cada 15 min)');
  console.log('[AURORA-REBOOK] ✅ Cron de re-booking D+7 configurado (10:00 AM Ecuador)');
  console.log('[AURORA-D1] ✅ Cron de follow-up D+1 configurado (10:05 AM Ecuador)');
  console.log('[AURORA-D3] ✅ Cron de follow-up D+3 FOMO configurado (14:00 PM Ecuador)');
  console.log('[AURORA-24H] ✅ Cron de recordatorio 24h configurado (18:00 PM Ecuador)');
  console.log('[AURORA-2H] ✅ Cron de recordatorio 2h configurado (cada 30 min 8-18h)');

  return { followupJob, rebookJob, d1Job, d3Job, reminder24hJob, reminder2hJob };
}
