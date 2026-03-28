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

// ─── No-Show Detection + Re-engagement ────────────────────────────────────────

async function detectNoShows() {
  console.log('[AURORA-NOSHOW] 👻 Detectando no-shows...');
  
  try {
    await databaseService.ensureInitialized();

    // Reservas confirmadas cuya fecha/hora ya pasó hace 3+ horas sin followup_1h (= no llegó)
    const noShows = await databaseService.all(`
      SELECT 
        r.id, r.user_phone, r.service_type, r.date, r.start_time, r.total_price,
        u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status = 'confirmed'
        AND (r.date::date + r.start_time::time) < (NOW() - INTERVAL '3 hours')
        AND r.followup_1h_sent_at IS NULL
        AND r.no_show_detected_at IS NULL
        AND r.date >= CURRENT_DATE - INTERVAL '3 days'
      ORDER BY r.date DESC, r.start_time DESC
      LIMIT 20
    `);

    if (noShows.length === 0) {
      console.log('[AURORA-NOSHOW] ℹ️ No se detectaron no-shows');
      return;
    }

    console.log(`[AURORA-NOSHOW] ⚠️ Detectados ${noShows.length} no-shows`);
    let processed = 0;

    for (const r of noShows) {
      try {
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';
        const wasFree = parseFloat(r.total_price || 0) === 0;

        // Marcar como no-show en BD
        await databaseService.run(
          `UPDATE reservations SET no_show_detected_at = NOW() WHERE id = $1`,
          [r.id]
        );

        // Mensaje empático (no acusatorio)
        const freeNote = wasFree
          ? '\n🎁 Tu visita gratis sigue disponible. Reagenda cuando quieras.'
          : '';

        const waMessage = `Hola ${firstName} 👋

Notamos que no pudiste venir a tu reserva en Coworkia. ¡Esperamos que todo esté bien!

No te preocupes, estas cosas pasan. ¿Te gustaría reagendar para otro día?${freeNote}

Solo dime la fecha y hora que te queden mejor y reservo para ti 😊`;

        await sendWhatsApp(r.user_phone, waMessage);

        processed++;
        console.log(`[AURORA-NOSHOW] ⚠️ No-show detectado: ${r.user_phone} (reserva #${r.id})`);
        await new Promise(resolve => setTimeout(resolve, 2500));

      } catch (error) {
        console.error(`[AURORA-NOSHOW] ❌ Error procesando no-show ${r.id}:`, error.message);
      }
    }

    console.log(`[AURORA-NOSHOW] 📊 Resumen: ${processed} no-shows procesados`);
  } catch (error) {
    console.error('[AURORA-NOSHOW] ❌ Error en cron no-show:', error.message);
  }
}

// ─── Upselling: Hot Desk Power Users → Membresía Aluna ───────────────────────

async function sendUpsellAluna() {
  console.log('[AURORA-UPSELL] 🎯 Buscando power users para upselling Aluna...');
  
  try {
    await databaseService.ensureInitialized();

    // Usuarios con 3+ reservas en últimos 30 días sin membresía y sin upsell previo
    const powerUsers = await databaseService.all(`
      SELECT 
        r.user_phone,
        u.name AS user_name,
        u.email AS user_email,
        COUNT(*) AS total_reservas,
        SUM(COALESCE(r.total_price, 0)) AS total_gastado,
        MAX(r.id) AS last_reservation_id
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status IN ('confirmed', 'completed')
        AND r.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY r.user_phone, u.name, u.email
      HAVING COUNT(*) >= 3
        AND MAX(r.upsell_aluna_sent_at) IS NULL
      ORDER BY SUM(COALESCE(r.total_price, 0)) DESC
      LIMIT 10
    `);

    if (powerUsers.length === 0) {
      console.log('[AURORA-UPSELL] ℹ️ No hay power users para upselling Aluna');
      return;
    }

    console.log(`[AURORA-UPSELL] 🎯 ${powerUsers.length} power users encontrados`);
    let sent = 0;

    for (const u of powerUsers) {
      try {
        const firstName = u.user_name ? u.user_name.split(' ')[0] : 'amig@';
        const totalGastado = parseFloat(u.total_gastado || 0);
        const alunaGoldCost = 180;
        const monthlyEstimate = totalGastado; // Ya es el gasto de 30 días
        const potentialSavings = monthlyEstimate - alunaGoldCost;
        const savingsPercent = monthlyEstimate > 0 ? Math.round((potentialSavings / monthlyEstimate) * 100) : 0;

        const waMessage = `¡Hola ${firstName}! 🌟

Hemos notado que eres un usuario frecuente de Coworkia — *${u.total_reservas} visitas* este mes. ¡Nos encanta tenerte!

💡 ¿Sabías que con una *Membresía Gold* podrías ahorrar?

📊 *Tu mes en números:*
• Reservas: ${u.total_reservas}
• Gasto total: $${totalGastado.toFixed(0)}
${potentialSavings > 0 ? `• Con Membresía Gold ($180/mes): *ahorras $${potentialSavings.toFixed(0)} (${savingsPercent}%)*` : '• Con Membresía Gold: acceso ilimitado por $180/mes'}

✅ *Membresía Gold incluye:*
• Acceso ilimitado a Hot Desk
• 4 horas/mes de Sala de Reuniones
• WiFi premium + Café ilimitado
• Casillero dedicado

¿Te interesa? Escríbeme y te paso los detalles 📋`;

        await sendWhatsApp(u.user_phone, waMessage);

        // Marcar en la última reserva
        await databaseService.run(
          `UPDATE reservations SET upsell_aluna_sent_at = NOW() WHERE id = $1`,
          [u.last_reservation_id]
        );

        sent++;
        console.log(`[AURORA-UPSELL] ✅ Upselling enviado a ${firstName} (${u.total_reservas} reservas, $${totalGastado.toFixed(0)})`);
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`[AURORA-UPSELL] ❌ Error enviando upsell a ${u.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-UPSELL] 📊 Resumen: ${sent} upsells enviados`);
  } catch (error) {
    console.error('[AURORA-UPSELL] ❌ Error en cron upselling:', error.message);
  }
}

// ─── Payment Reminder (pendientes de pago) ────────────────────────────────────

async function sendPaymentReminders() {
  console.log('[AURORA-PAY] 💳 Buscando reservas pendientes de pago...');
  
  try {
    await databaseService.ensureInitialized();

    // Reservas confirmadas con pago pendiente, fecha mañana o hoy
    const pending = await databaseService.all(`
      SELECT 
        r.id, r.user_phone, r.service_type, r.date, r.start_time, r.total_price,
        u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status = 'confirmed'
        AND r.payment_status IN ('pending', 'pending_efectivo')
        AND r.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
        AND r.payment_reminder_sent_at IS NULL
        AND r.total_price > 0
      ORDER BY r.date ASC
      LIMIT 20
    `);

    if (pending.length === 0) {
      console.log('[AURORA-PAY] ℹ️ No hay reservas pendientes de pago');
      return;
    }

    console.log(`[AURORA-PAY] 💳 ${pending.length} reservas pendientes de pago`);
    let sent = 0;

    for (const r of pending) {
      try {
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';
        const serviceLabel = r.service_type === 'hot_desk' ? 'Hot Desk'
          : r.service_type === 'meeting_room' ? 'Sala de Reuniones'
          : r.service_type === 'private_office' ? 'Oficina Privada' : r.service_type;

        const waMessage = `Hola ${firstName} 👋

Tienes una reserva de *${serviceLabel}* para el *${formatDate(r.date)}* a las *${r.start_time}* pendiente de pago.

💰 *Monto:* $${parseFloat(r.total_price).toFixed(2)}

Puedes pagar en efectivo al llegar o por transferencia bancaria. Si necesitas ayuda con el pago, escríbeme 😊

⚠️ Las reservas sin pago confirmado pueden ser liberadas 2h antes del horario.`;

        await sendWhatsApp(r.user_phone, waMessage);

        await databaseService.run(
          `UPDATE reservations SET payment_reminder_sent_at = NOW() WHERE id = $1`,
          [r.id]
        );

        sent++;
        console.log(`[AURORA-PAY] ✅ Recordatorio pago enviado a ${r.user_phone} ($${r.total_price})`);
        await new Promise(resolve => setTimeout(resolve, 2500));

      } catch (error) {
        console.error(`[AURORA-PAY] ❌ Error enviando recordatorio pago a ${r.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-PAY] 📊 Resumen: ${sent} recordatorios de pago enviados`);
  } catch (error) {
    console.error('[AURORA-PAY] ❌ Error en cron payment reminder:', error.message);
  }
}

// ─── Recordatorio 10 minutos antes de reserva (solo WhatsApp) ─────────────────

async function sendReminder10min() {
  console.log('[AURORA-10MIN] ⏰ Buscando reservas para recordatorio 10min...');
  
  try {
    await databaseService.ensureInitialized();

    // Reservas confirmadas de HOY cuya hora de inicio está a 5-15 min de ahora
    const reservations = await databaseService.all(`
      SELECT 
        r.id, r.user_phone, r.service_type, r.date, r.start_time, r.end_time,
        r.hot_desk_number, r.payment_status, r.total_price,
        u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone
      WHERE r.status = 'confirmed'
        AND r.date = CURRENT_DATE
        AND r.start_time::time BETWEEN (NOW() + INTERVAL '5 minutes')::time 
                                     AND (NOW() + INTERVAL '15 minutes')::time
        AND r.reminder_10min_sent_at IS NULL
      ORDER BY r.start_time ASC
      LIMIT 20
    `);

    if (reservations.length === 0) {
      console.log('[AURORA-10MIN] ℹ️ No hay reservas para recordatorio 10min');
      return;
    }

    console.log(`[AURORA-10MIN] 📨 Enviando ${reservations.length} recordatorios 10min...`);
    let sent = 0, failed = 0;

    for (const r of reservations) {
      try {
        const serviceLabel = r.service_type === 'hot_desk' ? 'Hot Desk'
          : r.service_type === 'meeting_room' ? 'Sala de Reuniones'
          : r.service_type === 'private_office' ? 'Oficina Privada' : r.service_type;
        const firstName = r.user_name ? r.user_name.split(' ')[0] : '';

        const deskInfo = r.hot_desk_number ? `\n🪑 Tu puesto: *Hot Desk #${r.hot_desk_number}*` : '';
        const payInfo = r.payment_status === 'paid' 
          ? '\n✅ Pago confirmado' 
          : r.total_price > 0 
            ? `\n💰 Pago pendiente: $${parseFloat(r.total_price).toFixed(2)} (efectivo al llegar)` 
            : '';

        const waMessage = `@aurora
⏰ *¡${firstName ? firstName + ', f' : 'F'}altan 10 minutos!*

Tu *${serviceLabel}* comienza a las *${r.start_time}* ${r.end_time ? `hasta las *${r.end_time}*` : ''}.
${deskInfo}${payInfo}

📍 *Coworkia Quito*
Av. 12 de Octubre N24-562 y Cordero
🅿️ Estacionamiento disponible
🔑 WiFi: *CoworkiaWiFi* / Clave: *coworkia2024*
☕ Café de cortesía en recepción

¡Te esperamos! 😊`;

        await sendWhatsApp(r.user_phone, waMessage);

        await databaseService.run(
          `UPDATE reservations SET reminder_10min_sent_at = NOW() WHERE id = $1`,
          [r.id]
        );

        sent++;
        console.log(`[AURORA-10MIN] ✅ Recordatorio 10min enviado a ${r.user_phone}`);
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failed++;
        console.error(`[AURORA-10MIN] ❌ Error enviando a ${r.user_phone}:`, error.message);
      }
    }

    console.log(`[AURORA-10MIN] 📊 Resumen: ${sent} enviados, ${failed} fallidos`);
  } catch (error) {
    console.error('[AURORA-10MIN] ❌ Error en cron 10min:', error.message);
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

  // Cron 7: No-Show Detection — cada 4 horas
  const noShowJob = new CronJob(
    '0 */4 * * *', // Cada 4 horas
    detectNoShows,
    null,
    true,
    'America/Guayaquil'
  );

  // Cron 8: Upselling Aluna — lunes 10:00 AM (inicio semana)
  const upsellJob = new CronJob(
    '0 10 * * 1', // Lunes 10:00 AM
    sendUpsellAluna,
    null,
    true,
    'America/Guayaquil'
  );

  // Cron 9: Payment Reminder — diario 8:00 AM
  const paymentJob = new CronJob(
    '0 8 * * *', // 8:00 AM todos los días
    sendPaymentReminders,
    null,
    true,
    'America/Guayaquil'
  );

  // Cron 10: Recordatorio 10 min antes — cada 5 min de 7AM a 8PM
  const reminder10minJob = new CronJob(
    '*/5 7-20 * * *', // Cada 5 min, horario laboral ampliado
    sendReminder10min,
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
  console.log('[AURORA-NOSHOW] ✅ Cron de no-show detection configurado (cada 4h)');
  console.log('[AURORA-UPSELL] ✅ Cron de upselling Aluna configurado (lunes 10AM)');
  console.log('[AURORA-PAY] ✅ Cron de payment reminder configurado (8:00 AM)');
  console.log('[AURORA-10MIN] ✅ Cron de recordatorio 10min configurado (cada 5 min 7-20h)');

  return { followupJob, rebookJob, d1Job, d3Job, reminder24hJob, reminder2hJob, noShowJob, upsellJob, paymentJob, reminder10minJob };
}
