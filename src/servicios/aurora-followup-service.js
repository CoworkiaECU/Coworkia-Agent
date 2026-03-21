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
    `✅ Tu reserva en Coworkia está confirmada.\n\n` +
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
    `¡Hola! 👋 Han pasado 7 días desde tu visita a Coworkia.\n\n` +
    `Esperamos que tu experiencia con la *${servicio}* haya sido excelente.\n\n` +
    `¿Tienes un próximo proyecto o reunión? Reservar es fácil:\n` +
    `👉 Escríbeme "quiero reservar" y te ayudo al instante 🚀\n\n` +
    `_Coworkia — Siempre hay una mesa para ti_ ☕`
  );
}
