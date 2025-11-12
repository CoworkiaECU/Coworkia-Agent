/**
 * 🔔 Helper para enviar notificaciones (Email + Calendar) de forma INLINE
 * Reemplaza el sistema de colas para garantizar envío inmediato
 * Incluye reintentos automáticos con backoff exponencial
 */

import { sendReservationConfirmation } from './email.js';
import { createCalendarEvent } from './google-calendar.js';
import { runWithRetry } from './external-dispatcher.js';

/**
 * 📧 Envía email de confirmación con reintentos
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendConfirmationEmail(emailData) {
  const logPrefix = `[Notification-Email] userId=${emailData.email}`;
  
  try {
    console.log(`${logPrefix} 📧 Enviando email de confirmación...`);
    
    const result = await runWithRetry(
      'email-confirmation',
      () => sendReservationConfirmation(emailData),
      {
        retries: 3,
        initialDelay: 1000,
        maxDelay: 4000,
        backoffMultiplier: 2,
        timeout: 10000
      }
    );
    
    console.log(`${logPrefix} ✅ Email enviado exitosamente`);
    return { success: true, result };
    
  } catch (error) {
    console.error(`${logPrefix} ❌ FALLO CRÍTICO enviando email después de reintentos:`, {
      error: error.message,
      stack: error.stack,
      emailTo: emailData.email,
      userName: emailData.userName
    });
    
    return { 
      success: false, 
      error: error.message,
      details: 'Email no pudo ser enviado después de 3 reintentos'
    };
  }
}

/**
 * 📅 Crea evento en Google Calendar con reintentos
 * @returns {Promise<{success: boolean, eventId?: string, error?: string}>}
 */
export async function createConfirmationCalendarEvent(calendarData) {
  const logPrefix = `[Notification-Calendar] userId=${calendarData.email}`;
  
  try {
    console.log(`${logPrefix} 📅 Creando evento en Google Calendar...`);
    
    const result = await runWithRetry(
      'calendar-event',
      () => createCalendarEvent(calendarData),
      {
        retries: 3,
        initialDelay: 1000,
        maxDelay: 4000,
        backoffMultiplier: 2,
        timeout: 15000
      }
    );
    
    console.log(`${logPrefix} ✅ Evento creado exitosamente:`, {
      eventId: result?.eventId,
      eventLink: result?.eventLink
    });
    
    return { 
      success: true, 
      eventId: result?.eventId,
      eventLink: result?.eventLink 
    };
    
  } catch (error) {
    console.error(`${logPrefix} ❌ FALLO CRÍTICO creando evento después de reintentos:`, {
      error: error.message,
      stack: error.stack,
      date: calendarData.date,
      startTime: calendarData.startTime,
      email: calendarData.email
    });
    
    return { 
      success: false, 
      error: error.message,
      details: 'Evento de calendar no pudo ser creado después de 3 reintentos'
    };
  }
}

/**
 * 🚀 Envía TODAS las notificaciones de una reserva INLINE
 * Ejecuta email y calendar en paralelo para velocidad
 * Ambos con reintentos independientes
 * 
 * @param {Object} notificationData - Datos de la reserva
 * @returns {Promise<{email: Object, calendar: Object}>} Resultados de ambas operaciones
 */
export async function sendReservationNotifications(notificationData) {
  const {
    email,
    userName,
    date,
    startTime,
    endTime,
    serviceType,
    guestCount = 0,
    wasFree = false,
    durationHours = 2,
    totalPrice = 0,
    reservation
  } = notificationData;
  
  console.log('[Notification-Inline] 🚀 INICIANDO notificaciones inline (email + calendar)...');
  console.log('[Notification-Inline] 📊 Datos:', {
    email,
    userName,
    date,
    startTime,
    serviceType,
    wasFree,
    totalPrice
  });
  
  // Ejecutar AMBAS notificaciones EN PARALELO con reintentos independientes
  const [emailResult, calendarResult] = await Promise.allSettled([
    sendConfirmationEmail({
      email,
      userName,
      date,
      startTime,
      endTime,
      serviceType,
      guestCount,
      wasFree,
      durationHours,
      totalPrice,
      reservation
    }),
    createConfirmationCalendarEvent({
      email,
      userName,
      date,
      startTime,
      endTime,
      serviceType,
      guestCount,
      price: totalPrice,
      duration: `${durationHours} horas`,
      reservationId: reservation?.id
    })
  ]);
  
  // Procesar resultados
  const emailStatus = emailResult.status === 'fulfilled' 
    ? emailResult.value 
    : { success: false, error: emailResult.reason?.message || 'Promise rejected' };
    
  const calendarStatus = calendarResult.status === 'fulfilled'
    ? calendarResult.value
    : { success: false, error: calendarResult.reason?.message || 'Promise rejected' };
  
  // Log de resumen
  console.log('[Notification-Inline] 📊 RESUMEN DE NOTIFICACIONES:');
  console.log(`  📧 Email: ${emailStatus.success ? '✅ ENVIADO' : '❌ FALLIDO'}`);
  console.log(`  📅 Calendar: ${calendarStatus.success ? '✅ CREADO' : '❌ FALLIDO'}`);
  
  if (!emailStatus.success) {
    console.error('[Notification-Inline] ⚠️ EMAIL NO SE ENVIÓ:', emailStatus.error);
  }
  
  if (!calendarStatus.success) {
    console.error('[Notification-Inline] ⚠️ CALENDAR NO SE CREÓ:', calendarStatus.error);
  }
  
  // Si AMBOS fallan, es crítico
  if (!emailStatus.success && !calendarStatus.success) {
    console.error('[Notification-Inline] 🚨 CRÍTICO: AMBAS NOTIFICACIONES FALLARON');
    console.error('[Notification-Inline] 🚨 Usuario NO recibirá confirmación por ningún canal');
    console.error('[Notification-Inline] 🚨 REVISIÓN MANUAL REQUERIDA para:', {
      email,
      userName,
      date,
      startTime,
      reservationId: reservation?.id
    });
  }
  
  return {
    email: emailStatus,
    calendar: calendarStatus,
    bothSucceeded: emailStatus.success && calendarStatus.success,
    anySucceeded: emailStatus.success || calendarStatus.success,
    bothFailed: !emailStatus.success && !calendarStatus.success
  };
}

export default {
  sendConfirmationEmail,
  createConfirmationCalendarEvent,
  sendReservationNotifications
};
