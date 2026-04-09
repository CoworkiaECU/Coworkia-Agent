/**
 * 🌟 Aurora Follow-up Service
 * Automatización de seguimientos post-reserva
 *
 * FLUJO:
 * - +1h: Confirmación cálida post-reserva (agradecimiento)
 * - D+7: Re-booking (invitar a volver)
 *
 * CRON JOBS (en index.js):
 * - Cada 15 min: check +1h followup
 * - 10:00 AM ECT: check D+7 re-booking
 */

import { enviarWhatsApp } from '../express-servidor/endpoints-api/wassenger.js';
import { sendEmail } from '../servicios/email.js';
import { buildEmailTemplate } from '../servicios/email-template-system.js';
import databaseService from '../database/database.js';
import {
  findReservationsForOneHourFollowup,
  markFollowup1hSent,
  findReservationsForRebookingReminder,
  markRebookReminderSent
} from '../database/auroraRepository.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.aurora || console;

// ─────────────────────────────────────────────────────────────
// FOLLOW-UP +1H POST-RESERVA
// ─────────────────────────────────────────────────────────────

/**
 * Envía mensajes de confirmación 1 hora después de reservar
 * Se llama desde cron cada 15 min
 */
export async function sendOneHourFollowups() {
  logger.info('[AURORA-FOLLOWUP] 🔔 Iniciando follow-ups +1h...');

  try {
    const reservations = await findReservationsForOneHourFollowup();

    if (!reservations || reservations.length === 0) {
      logger.info('[AURORA-FOLLOWUP] ℹ️ Sin reservas para +1h followup');
      return { success: true, sent: 0 };
    }

    logger.info(`[AURORA-FOLLOWUP] 📊 ${reservations.length} reservas para +1h`);

    let sent = 0;
    let errors = 0;

    for (const reservation of reservations) {
      try {
        const waMessage = buildOneHourWhatsApp(reservation);
        await enviarWhatsApp(reservation.user_phone, waMessage);

        await markFollowup1hSent(reservation.id);
        sent++;

        logger.info(`[AURORA-FOLLOWUP] ✅ +1h enviado: ${reservation.user_phone} (${reservation.service_type})`);

        // Delay entre envíos
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        errors++;
        logger.error(`[AURORA-FOLLOWUP] ❌ Error +1h (${reservation.user_phone}):`, err);
      }
    }

    logger.info(`[AURORA-FOLLOWUP] ✅ +1h completado: ${sent} enviados, ${errors} errores`);
    return { success: true, sent, errors };

  } catch (err) {
    logger.error('[AURORA-FOLLOWUP] ❌ Error general +1h:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// RE-BOOKING D+7
// ─────────────────────────────────────────────────────────────

/**
 * Envía invitación a volver 7 días después de la reserva completada
 * Se llama desde cron una vez al día (10am)
 */
export async function sendRebookingReminders() {
  logger.info('[AURORA-FOLLOWUP] 🔁 Iniciando re-booking D+7...');

  try {
    const reservations = await findReservationsForRebookingReminder();

    if (!reservations || reservations.length === 0) {
      logger.info('[AURORA-FOLLOWUP] ℹ️ Sin reservas para re-booking D+7');
      return { success: true, sent: 0 };
    }

    logger.info(`[AURORA-FOLLOWUP] 📊 ${reservations.length} reservas para D+7`);

    let sent = 0;
    let errors = 0;

    for (const reservation of reservations) {
      try {
        const waMessage = buildRebookingWhatsApp(reservation);
        await enviarWhatsApp(reservation.user_phone, waMessage);

        await markRebookReminderSent(reservation.id);
        sent++;

        logger.info(`[AURORA-FOLLOWUP] ✅ D+7 enviado: ${reservation.user_phone}`);
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        errors++;
        logger.error(`[AURORA-FOLLOWUP] ❌ Error D+7 (${reservation.user_phone}):`, err);
      }
    }

    logger.info(`[AURORA-FOLLOWUP] ✅ D+7 completado: ${sent} enviados, ${errors} errores`);
    return { success: true, sent, errors };

  } catch (err) {
    logger.error('[AURORA-FOLLOWUP] ❌ Error general D+7:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES DE MENSAJES
// ─────────────────────────────────────────────────────────────

function getServiceLabel(serviceType) {
  const labels = {
    sala_reunion: 'Sala de Reuniones',
    oficina_privada: 'Oficina Privada',
    hot_desk: 'Hot Desk',
    evento: 'Evento',
    coworking: 'Espacio Coworking'
  };
  return labels[serviceType] || serviceType || 'espacio';
}

// ─────────────────────────────────────────────────────────────
// TRIGGER MANUAL (una reserva específica)
// ─────────────────────────────────────────────────────────────

/**
 * Envía follow-up +1h a una reserva específica (uso manual desde dashboard)
 */
export async function sendOneHourFollowup(reservation) {
  const waMessage = buildOneHourWhatsApp(reservation);
  await enviarWhatsApp(reservation.user_phone, waMessage);
  await markFollowup1hSent(reservation.id);
  logger.info(`[AURORA-FOLLOWUP] ✅ +1h manual enviado: ${reservation.user_phone}`);
}

/**
 * Envía recordatorio de re-booking a una reserva específica (uso manual desde dashboard)
 */
export async function sendRebookingReminder(reservation) {
  const waMessage = buildRebookingWhatsApp(reservation);
  await enviarWhatsApp(reservation.user_phone, waMessage);
  await markRebookReminderSent(reservation.id);
  logger.info(`[AURORA-FOLLOWUP] ✅ D+7 manual enviado: ${reservation.user_phone}`);
}

function buildOneHourWhatsApp(reservation) {
  const servicio = getServiceLabel(reservation.service_type);
  const fecha = reservation.date
    ? new Date(reservation.date).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'tu fecha reservada';
  const hora = reservation.start_time || '';

  return (
    `@aurora\n✅ Tu reserva en Coworkia está confirmada.\n\n` +
    `📍 *${servicio}*\n` +
    `📅 ${fecha}${hora ? ` a las ${hora}` : ''}\n` +
    (reservation.total_price > 0 ? `💵 $${reservation.total_price}\n` : '') +
    `\n¿Necesitas algo antes de llegar? Estamos aquí para ayudarte 🙌\n\n` +
    `_Coworkia — Espacios que inspiran_`
  );
}

function buildRebookingWhatsApp(reservation) {
  const servicio = getServiceLabel(reservation.service_type);

  return (
    `@aurora\n¡Hola! 👋 Han pasado 7 días desde tu visita a Coworkia.\n\n` +
    `Esperamos que tu experiencia con la *${servicio}* haya sido excelente.\n\n` +
    `¿Tienes un próximo proyecto o reunión? Reservar es fácil:\n` +
    `👉 Escríbeme "quiero reservar" y te ayudo al instante 🚀\n\n` +
    `_Coworkia — Siempre hay una mesa para ti_ ☕`
  );
}

// ─────────────────────────────────────────────────────────────
// MIGRATED FROM OLD aurora-followup-cron.js (Sprint 1 — dedup)
// These 8 functions were unique to the old monolith.
// ─────────────────────────────────────────────────────────────

function formatDateEs(dateStr) {
  const date = new Date(dateStr);
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
}

function getServiceLabelLegacy(type) {
  return type === 'hotDesk' ? 'Hot Desk'
    : type === 'meetingRoom' ? 'Sala de Reuniones'
    : type === 'hot_desk' ? 'Hot Desk'
    : type === 'meeting_room' ? 'Sala de Reuniones'
    : type === 'private_office' ? 'Oficina Privada'
    : type === 'deskIndividual' ? 'Escritorio Individual'
    : 'Espacio';
}

// ─── Aurora D+1: Feedback post-visit ────────────────────────

export async function sendAuroraD1Followups() {
  logger.info('[AURORA-D1] 📨 Buscando reservas para follow-up D+1...');
  try {
    const reservations = await databaseService.all(`
      SELECT r.id, r.user_phone, r.service_type, r.date, r.start_time,
             u.name AS user_name, u.email AS user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status IN ('confirmed', 'completed')
        AND r.date = CURRENT_DATE - INTERVAL '1 day'
        AND r.followup_d1_sent_at IS NULL
      ORDER BY r.date ASC LIMIT 30
    `);

    if (!reservations.length) {
      logger.info('[AURORA-D1] ℹ️ No hay reservas para D+1');
      return { success: true, sent: 0, errors: 0 };
    }

    let sent = 0, errors = 0;
    for (const r of reservations) {
      try {
        const serviceLabel = getServiceLabelLegacy(r.service_type);
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';
        const serviceQuestion = r.service_type === 'meeting_room'
          ? '¿Tu reunión fue un éxito? 🎯' : '¿Tuviste un día productivo? 💪';

        const waMessage = `¡Hola ${firstName}! 😊\n\nAyer disfrutaste de tu *${serviceLabel}* en Coworkia. ${serviceQuestion}\n\nTu feedback nos ayuda a mejorar. ¿Qué calificación nos das del 1 al 5? ⭐\n\nY si quieres volver pronto, solo dime y reservo para ti 📅`;
        await enviarWhatsApp(r.user_phone, waMessage);

        if (r.user_email) {
          const html = buildEmailTemplate('AURORA', 'D1', {
            nombre: r.user_name || firstName, servicio: serviceLabel, dia: formatDateEs(r.date)
          });
          await sendEmail({ to: r.user_email, subject: '¿Cómo estuvo tu experiencia en Coworkia? 🌟', html });
        }

        await databaseService.run(`UPDATE reservations SET followup_d1_sent_at = NOW() WHERE id = $1`, [r.id]);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (err) {
        errors++;
        logger.error(`[AURORA-D1] ❌ Error ${r.user_phone}:`, err.message);
      }
    }
    logger.info(`[AURORA-D1] 📊 D+1: ${sent} enviados, ${errors} fallidos`);
    return { success: true, sent, errors };
  } catch (err) {
    logger.error('[AURORA-D1] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Aurora D+3: FOMO / upselling suave ─────────────────────

export async function sendAuroraD3Followups() {
  logger.info('[AURORA-D3] 🔥 Buscando reservas para follow-up D+3 FOMO...');
  try {
    const reservations = await databaseService.all(`
      SELECT r.id, r.user_phone, r.service_type, r.date, r.total_price,
             u.name AS user_name, u.email AS user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status IN ('confirmed', 'completed')
        AND r.date BETWEEN CURRENT_DATE - INTERVAL '4 days' AND CURRENT_DATE - INTERVAL '3 days'
        AND r.followup_d3_sent_at IS NULL
        AND r.followup_d1_sent_at IS NOT NULL
      ORDER BY r.date ASC LIMIT 30
    `);

    if (!reservations.length) {
      logger.info('[AURORA-D3] ℹ️ No hay reservas para D+3');
      return { success: true, sent: 0, errors: 0 };
    }

    let sent = 0, errors = 0;
    for (const r of reservations) {
      try {
        const serviceLabel = getServiceLabelLegacy(r.service_type);
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';
        const wasFree = parseFloat(r.total_price || 0) === 0;

        let fomoLine;
        if (wasFree) fomoLine = '🎁 Tu primera visita gratis ya pasó, pero tenemos *15% OFF* en tu siguiente reserva esta semana.';
        else if (r.service_type === 'meeting_room') fomoLine = '👥 ¿Tienes otra reunión pendiente? Salas disponibles esta semana con horarios flexibles.';
        else fomoLine = '💡 ¿Sabías que con una *Membresía Coworkia* ahorras hasta un 40%? Pregúntame por los planes.';

        const waMessage = `¡Hola ${firstName}! 🚀\n\nHan pasado 3 días desde tu visita a Coworkia. ¿Cuándo vuelves?\n\n${fomoLine}\n\n📊 *Esta semana en Coworkia:*\n✅ WiFi premium · ☕ Café ilimitado\n\nSolo dime qué día y hora y reservo para ti 📅`;
        await enviarWhatsApp(r.user_phone, waMessage);

        if (r.user_email) {
          const html = buildEmailTemplate('AURORA', 'D3', {
            nombre: r.user_name || firstName, servicio: serviceLabel, wasFree
          });
          await sendEmail({ to: r.user_email, subject: `¿Cuándo vuelves a Coworkia, ${firstName}? 🚀`, html });
        }

        await databaseService.run(`UPDATE reservations SET followup_d3_sent_at = NOW() WHERE id = $1`, [r.id]);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (err) {
        errors++;
        logger.error(`[AURORA-D3] ❌ Error ${r.user_phone}:`, err.message);
      }
    }
    logger.info(`[AURORA-D3] 📊 D+3: ${sent} enviados, ${errors} fallidos`);
    return { success: true, sent, errors };
  } catch (err) {
    logger.error('[AURORA-D3] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Recordatorio 24h antes de reserva ──────────────────────

export async function sendAuroraReminder24h() {
  logger.info('[AURORA-24H] 📅 Buscando reservas para recordatorio 24h...');
  try {
    const reservations = await databaseService.all(`
      SELECT r.id, r.user_phone, r.service_type, r.date, r.start_time,
             u.name AS user_name, u.email AS user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status = 'confirmed'
        AND r.date = CURRENT_DATE + INTERVAL '1 day'
        AND r.reminder_24h_sent_at IS NULL
      ORDER BY r.start_time ASC LIMIT 30
    `);

    if (!reservations.length) {
      logger.info('[AURORA-24H] ℹ️ No hay reservas para recordatorio 24h');
      return { success: true, sent: 0, errors: 0 };
    }

    let sent = 0, errors = 0;
    for (const r of reservations) {
      try {
        const serviceLabel = getServiceLabelLegacy(r.service_type);
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';

        const waMessage = `¡Hola ${firstName}! 📅\n\nTe recordamos que *mañana* a las *${r.start_time}* tienes tu reserva de *${serviceLabel}* en Coworkia.\n\n📍 *Dirección:* Whymper 403, Edificio Finistere\n🏙️ Zona segura — acceso directo en planta baja\n📍 https://maps.app.goo.gl/Nqy6YeGuxo3czEt66\n☕ Café incluido\n\n¿Todo listo? Si necesitas cancelar o cambiar la hora, escríbeme y te ayudo 😊`;
        await enviarWhatsApp(r.user_phone, waMessage);

        if (r.user_email) {
          const html = buildEmailTemplate('AURORA', 'REMINDER_24H', {
            nombre: r.user_name || firstName, servicio: serviceLabel,
            dia: formatDateEs(r.date), hora: r.start_time
          });
          await sendEmail({ to: r.user_email, subject: `📅 Mañana a las ${r.start_time} te esperamos en Coworkia`, html });
        }

        await databaseService.run(`UPDATE reservations SET reminder_24h_sent_at = NOW() WHERE id = $1`, [r.id]);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        errors++;
        logger.error(`[AURORA-24H] ❌ Error ${r.user_phone}:`, err.message);
      }
    }
    logger.info(`[AURORA-24H] 📊 24h: ${sent} enviados, ${errors} fallidos`);
    return { success: true, sent, errors };
  } catch (err) {
    logger.error('[AURORA-24H] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Recordatorio 2h antes de reserva (solo WA) ────────────

export async function sendAuroraReminder2h() {
  logger.info('[AURORA-2H] 🔔 Buscando reservas para recordatorio 2h...');
  try {
    const reservations = await databaseService.all(`
      SELECT r.id, r.user_phone, r.service_type, r.date, r.start_time,
             u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status = 'confirmed'
        AND r.date = CURRENT_DATE
        AND r.start_time::time BETWEEN (NOW() + INTERVAL '1 hour 30 minutes')::time
                                     AND (NOW() + INTERVAL '2 hours 30 minutes')::time
        AND r.reminder_2h_sent_at IS NULL
      ORDER BY r.start_time ASC LIMIT 20
    `);

    if (!reservations.length) {
      logger.info('[AURORA-2H] ℹ️ No hay reservas para recordatorio 2h');
      return { success: true, sent: 0, errors: 0 };
    }

    let sent = 0, errors = 0;
    for (const r of reservations) {
      try {
        const serviceLabel = getServiceLabelLegacy(r.service_type);
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';

        const waMessage = `🔔 *¡Recordatorio!* ${firstName}\n\nEn *2 horas* te esperamos en Coworkia para tu *${serviceLabel}* a las *${r.start_time}*.\n\n📍 Whymper 403, Edificio Finistere\n📍 https://maps.app.goo.gl/Nqy6YeGuxo3czEt66\n\n¡Nos vemos pronto! 😊`;
        await enviarWhatsApp(r.user_phone, waMessage);

        await databaseService.run(`UPDATE reservations SET reminder_2h_sent_at = NOW() WHERE id = $1`, [r.id]);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        errors++;
        logger.error(`[AURORA-2H] ❌ Error ${r.user_phone}:`, err.message);
      }
    }
    logger.info(`[AURORA-2H] 📊 2h: ${sent} enviados, ${errors} fallidos`);
    return { success: true, sent, errors };
  } catch (err) {
    logger.error('[AURORA-2H] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Recordatorio 10 min antes de reserva (solo WA) ────────

export async function sendAuroraReminder10min() {
  logger.info('[AURORA-10MIN] ⏰ Buscando reservas para recordatorio 10min...');
  try {
    const reservations = await databaseService.all(`
      SELECT r.id, r.user_phone, r.service_type, r.date, r.start_time, r.end_time,
             r.hot_desk_number, r.payment_status, r.total_price,
             u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status = 'confirmed'
        AND r.date = CURRENT_DATE
        AND r.start_time::time BETWEEN (NOW() + INTERVAL '5 minutes')::time
                                     AND (NOW() + INTERVAL '15 minutes')::time
        AND r.reminder_10min_sent_at IS NULL
      ORDER BY r.start_time ASC LIMIT 20
    `);

    if (!reservations.length) {
      logger.info('[AURORA-10MIN] ℹ️ No hay reservas para recordatorio 10min');
      return { success: true, sent: 0, errors: 0 };
    }

    let sent = 0, errors = 0;
    for (const r of reservations) {
      try {
        const serviceLabel = getServiceLabelLegacy(r.service_type);
        const firstName = r.user_name ? r.user_name.split(' ')[0] : '';

        const deskInfo = r.hot_desk_number ? `\n🪑 Tu puesto: *Hot Desk #${r.hot_desk_number}*` : '';
        const payInfo = r.payment_status === 'paid'
          ? '\n✅ Pago confirmado'
          : r.total_price > 0
            ? `\n💰 Pago pendiente: $${parseFloat(r.total_price).toFixed(2)} (efectivo al llegar)`
            : '';

        const waMessage = `⏰ *¡${firstName ? firstName + ', f' : 'F'}altan 10 minutos!*\n\nTu *${serviceLabel}* comienza a las *${r.start_time}* ${r.end_time ? `hasta las *${r.end_time}*` : ''}.\n${deskInfo}${payInfo}\n\n📍 *Coworkia Quito*\nWhymper 403, Edificio Finistere\n🏙️ Zona segura — acceso directo en planta baja\n📍 https://maps.app.goo.gl/Nqy6YeGuxo3czEt66\n🔑 WiFi: *CoworkiaWiFi* / Clave: *coworkia2024*\n☕ Café de cortesía en recepción\n\n¡Te esperamos! 😊`;
        await enviarWhatsApp(r.user_phone, waMessage);

        await databaseService.run(`UPDATE reservations SET reminder_10min_sent_at = NOW() WHERE id = $1`, [r.id]);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        errors++;
        logger.error(`[AURORA-10MIN] ❌ Error ${r.user_phone}:`, err.message);
      }
    }
    logger.info(`[AURORA-10MIN] 📊 10min: ${sent} enviados, ${errors} fallidos`);
    return { success: true, sent, errors };
  } catch (err) {
    logger.error('[AURORA-10MIN] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── No-Show Detection + Re-engagement ──────────────────────

export async function detectAuroraNoShows() {
  logger.info('[AURORA-NOSHOW] 👻 Detectando no-shows...');
  try {
    const noShows = await databaseService.all(`
      SELECT r.id, r.user_phone, r.service_type, r.date, r.start_time, r.total_price,
             u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status = 'confirmed'
        AND (r.date::date + r.start_time::time) < (NOW() - INTERVAL '3 hours')
        AND r.followup_1h_sent_at IS NULL
        AND r.no_show_detected_at IS NULL
        AND r.date >= CURRENT_DATE - INTERVAL '3 days'
      ORDER BY r.date DESC, r.start_time DESC LIMIT 20
    `);

    if (!noShows.length) {
      logger.info('[AURORA-NOSHOW] ℹ️ No se detectaron no-shows');
      return { success: true, sent: 0 };
    }

    let sent = 0;
    for (const r of noShows) {
      try {
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';
        const wasFree = parseFloat(r.total_price || 0) === 0;
        const freeNote = wasFree ? '\n🎁 Tu visita gratis sigue disponible. Reagenda cuando quieras.' : '';

        await databaseService.run(`UPDATE reservations SET no_show_detected_at = NOW() WHERE id = $1`, [r.id]);

        const waMessage = `Hola ${firstName} 👋\n\nNotamos que no pudiste venir a tu reserva en Coworkia. ¡Esperamos que todo esté bien!\n\nNo te preocupes, estas cosas pasan. ¿Te gustaría reagendar para otro día?${freeNote}\n\nSolo dime la fecha y hora que te queden mejor y reservo para ti 😊`;
        await enviarWhatsApp(r.user_phone, waMessage);

        sent++;
        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (err) {
        logger.error(`[AURORA-NOSHOW] ❌ Error ${r.id}:`, err.message);
      }
    }
    logger.info(`[AURORA-NOSHOW] 📊 ${sent} no-shows procesados`);
    return { success: true, sent };
  } catch (err) {
    logger.error('[AURORA-NOSHOW] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Upselling: Power Users → Membresía Aluna ──────────────

export async function sendAuroraUpsellAluna() {
  logger.info('[AURORA-UPSELL] 🎯 Buscando power users para upselling...');
  try {
    const powerUsers = await databaseService.all(`
      SELECT r.user_phone, u.name AS user_name, u.email AS user_email,
             COUNT(*) AS total_reservas, SUM(COALESCE(r.total_price, 0)) AS total_gastado,
             MAX(r.id) AS last_reservation_id
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status IN ('confirmed', 'completed')
        AND r.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY r.user_phone, u.name, u.email
      HAVING COUNT(*) >= 3 AND MAX(r.upsell_aluna_sent_at) IS NULL
      ORDER BY SUM(COALESCE(r.total_price, 0)) DESC LIMIT 10
    `);

    if (!powerUsers.length) {
      logger.info('[AURORA-UPSELL] ℹ️ No hay power users para upselling');
      return { success: true, sent: 0 };
    }

    let sent = 0;
    for (const u of powerUsers) {
      try {
        const firstName = u.user_name ? u.user_name.split(' ')[0] : 'amig@';
        const totalGastado = parseFloat(u.total_gastado || 0);
        const alunaGoldCost = 180;
        const potentialSavings = totalGastado - alunaGoldCost;
        const savingsPercent = totalGastado > 0 ? Math.round((potentialSavings / totalGastado) * 100) : 0;

        const savingsLine = potentialSavings > 0
          ? `• Con Membresía Gold ($180/mes): *ahorras $${potentialSavings.toFixed(0)} (${savingsPercent}%)*`
          : '• Con Membresía Gold: acceso ilimitado por $180/mes';

        const waMessage = `¡Hola ${firstName}! 🌟\n\nHemos notado que eres un usuario frecuente de Coworkia — *${u.total_reservas} visitas* este mes. ¡Nos encanta tenerte!\n\n💡 ¿Sabías que con una *Membresía Gold* podrías ahorrar?\n\n📊 *Tu mes en números:*\n• Reservas: ${u.total_reservas}\n• Gasto total: $${totalGastado.toFixed(0)}\n${savingsLine}\n\n✅ *Membresía Gold incluye:*\n• Acceso ilimitado a Hot Desk\n• 4 horas/mes de Sala de Reuniones\n• WiFi premium + Café ilimitado\n• Casillero dedicado\n\n¿Te interesa? Escríbeme y te paso los detalles 📋`;
        await enviarWhatsApp(u.user_phone, waMessage);

        await databaseService.run(`UPDATE reservations SET upsell_aluna_sent_at = NOW() WHERE id = $1`, [u.last_reservation_id]);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (err) {
        logger.error(`[AURORA-UPSELL] ❌ Error ${u.user_phone}:`, err.message);
      }
    }
    logger.info(`[AURORA-UPSELL] 📊 ${sent} upsells enviados`);
    return { success: true, sent };
  } catch (err) {
    logger.error('[AURORA-UPSELL] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Payment Reminders (pendientes de pago) ─────────────────

export async function sendAuroraPaymentReminders() {
  logger.info('[AURORA-PAY] 💳 Buscando reservas pendientes de pago...');
  try {
    const pending = await databaseService.all(`
      SELECT r.id, r.user_phone, r.service_type, r.date, r.start_time, r.total_price,
             u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.status = 'confirmed'
        AND r.payment_status IN ('pending', 'pending_efectivo')
        AND r.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
        AND r.payment_reminder_sent_at IS NULL
        AND r.total_price > 0
      ORDER BY r.date ASC LIMIT 20
    `);

    if (!pending.length) {
      logger.info('[AURORA-PAY] ℹ️ No hay reservas pendientes de pago');
      return { success: true, sent: 0 };
    }

    let sent = 0;
    for (const r of pending) {
      try {
        const firstName = r.user_name ? r.user_name.split(' ')[0] : 'amig@';
        const serviceLabel = getServiceLabelLegacy(r.service_type);

        const waMessage = `Hola ${firstName} 👋\n\nTienes una reserva de *${serviceLabel}* para el *${formatDateEs(r.date)}* a las *${r.start_time}* pendiente de pago.\n\n💰 *Monto:* $${parseFloat(r.total_price).toFixed(2)}\n\nPuedes pagar en efectivo al llegar o por transferencia bancaria. Si necesitas ayuda con el pago, escríbeme 😊\n\n⚠️ Las reservas sin pago confirmado pueden ser liberadas 2h antes del horario.\n\n💳 Si quieres dejar todo listo, responde con tu forma de pago preferida:\n   1️⃣ Efectivo al llegar\n   2️⃣ Transferencia bancaria\n\nAsí cuando llegues a Coworkia todo estará listo y sin distracciones 😊`;
        await enviarWhatsApp(r.user_phone, waMessage);

        await databaseService.run(`UPDATE reservations SET payment_reminder_sent_at = NOW() WHERE id = $1`, [r.id]);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (err) {
        logger.error(`[AURORA-PAY] ❌ Error ${r.user_phone}:`, err.message);
      }
    }
    logger.info(`[AURORA-PAY] 📊 ${sent} recordatorios de pago enviados`);
    return { success: true, sent };
  } catch (err) {
    logger.error('[AURORA-PAY] ❌ Error general:', err.message);
    return { success: false, error: err.message };
  }
}
