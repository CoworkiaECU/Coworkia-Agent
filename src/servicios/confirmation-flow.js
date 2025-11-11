/**
 * 🔄 Servicio de Confirmaciones SI/NO para WhatsApp
 * Maneja flujos de confirmación de reservas antes del pago
 */

import { loadProfile, saveProfile, updateUser, getPaymentInfo } from '../perfiles-interacciones/memoria.js';
import { createReservation } from './calendario.js';
import { sendReservationConfirmation } from './email.js';
import { checkAvailability, getOccupancyStats } from './availability-system.js';
import { createCalendarEvent } from './google-calendar.js';

/**
 * ✅ Detecta respuestas afirmativas del usuario
 */
export function isPositiveResponse(message) {
  if (!message || typeof message !== 'string') return false;
  
  const text = message.toLowerCase().trim();
  
  // Respuestas afirmativas comunes en español
  const positivePatterns = [
    /^s[ií]$/,
    /^ok$/,
    /^okay$/,
    /^perfecto$/,
    /^correcto$/,
    /^confirmo$/,
    /^confirmado$/,
    /^acepto$/,
    /^aceptado$/,
    /^dale$/,
    /^listo$/,
    /^exacto$/,
    /^claro$/,
    /^por supuesto$/,
    /^obvio$/,
    /^obvio que s[ií]$/,
    /^s[ií]\s*(por favor|porfavor|please)?$/,
    /^(s[ií]\s*)?gracias$/,
    /^vamos$/,
    /^hagamos$/,
    /^adelante$/,
    /^continuar$/,
    /^continu[aá]mos$/,
    /^proceder$/,
    // Emojis de confirmación
    /👍/,
    /✅/,
    /👌/,
    /💯/,
    /🚀/
  ];
  
  return positivePatterns.some(pattern => pattern.test(text));
}

/**
 * ❌ Detecta respuestas negativas del usuario
 */
export function isNegativeResponse(message) {
  if (!message || typeof message !== 'string') return false;
  
  const text = message.toLowerCase().trim();
  
  // Respuestas negativas comunes en español
  const negativePatterns = [
    /^no$/,
    /^nop$/,
    /^nope$/,
    /^negative$/,
    /^negativo$/,
    /^cancel$/,
    /^cancelar$/,
    /^cancelo$/,
    /^rechazo$/,
    /^rechazar$/,
    /^no acepto$/,
    /^no confirmo$/,
    /^no quiero$/,
    /^mejor no$/,
    /^ahora no$/,
    /^otro d[ií]a$/,
    /^lo pienso$/,
    /^d[eé]jame pensar$/,
    /^mejor otro momento$/,
    /^no por ahora$/,
    // Emojis de negación
    /👎/,
    /❌/,
    /🚫/,
    /😕/,
    /😐/
  ];
  
  return negativePatterns.some(pattern => pattern.test(text));
}

/**
 * 💡 Genera mensaje de confirmación de reserva
 */
export function generateConfirmationMessage(reservationData, userProfile) {
  const {
    date,
    startTime,
    endTime,
    serviceType,
    durationHours,
    totalPrice,
    wasFree,
    guestCount = 0
  } = reservationData;
  
  const userName = userProfile.name ? `, ${userProfile.name}` : '';
  const serviceName = serviceType === 'hotDesk' ? 'Hot Desk' : 
                     serviceType === 'meetingRoom' ? 'Sala de Reuniones' : 
                     serviceType === 'privateOffice' ? 'Oficina Privada' : serviceType;
  
  const formattedDate = new Date(date).toLocaleDateString('es-EC', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Solo Hot Desk puede ser gratis, sala de reuniones NUNCA
  const isActuallyFree = wasFree && serviceType === 'hotDesk';
  
  // Información de acompañantes
  const totalPeople = 1 + guestCount;
  const peopleInfo = guestCount > 0 ? 
    `👥 *Personas:* ${totalPeople} (tú + ${guestCount} acompañante${guestCount > 1 ? 's' : ''})` : 
    `👥 *Personas:* Solo tú`;
  
  if (isActuallyFree) {
    return `¡Perfecto${userName}! 🎉

📋 *CONFIRMA TUS 2 HORAS GRATIS:*

📅 *Fecha:* ${formattedDate}
⏰ *Horario:* ${startTime} - ${endTime} 
🏢 *Espacio:* ${serviceName}
${peopleInfo}
⏱️ *Duración:* ${durationHours} hora${durationHours > 1 ? 's' : ''}
💰 *Precio:* ¡GRATIS! (primera vez)

¿*Confirmas esta reserva?*

Responde *SI* para confirmar o *NO* para cancelar 👍`;
  }

  return `¡Perfecto${userName}! 🎉

📋 *CONFIRMA TU RESERVA:*

📅 *Fecha:* ${formattedDate}
⏰ *Horario:* ${startTime} - ${endTime}
🏢 *Espacio:* ${serviceName}
${peopleInfo}
⏱️ *Duración:* ${durationHours} hora${durationHours > 1 ? 's' : ''}
💰 *Total:* $${totalPrice} USD

¿*Confirmas esta reserva?*

Responde *SI* para continuar con el pago o *NO* para cancelar 👍`;
}

/**
 * 🎯 Procesa confirmación positiva
 */
export async function processPositiveConfirmation(userProfile, pendingReservation) {
  try {
    const userName = userProfile.name ? `, ${userProfile.name}` : '';
    
    // 🔍 1. Verificar disponibilidad antes de crear reserva
    console.log('[Confirmation] 🔍 Verificando disponibilidad antes de confirmar...');
    const availability = await checkAvailability({
      date: pendingReservation.date,
      startTime: pendingReservation.startTime,
      endTime: pendingReservation.endTime,
      serviceType: pendingReservation.serviceType,
      guestCount: pendingReservation.guestCount || 0
    });
    
    if (!availability.available) {
      return {
        success: false,
        message: `❌ Lo siento${userName}, ese horario ya no está disponible:

${availability.reason}

${availability.suggestions ? '💡 **Alternativas disponibles:**\n' + availability.suggestions.map(s => `• ${s}`).join('\n') : ''}

¿Te gustaría probar con otro horario? 🕐`,
        needsAction: false
      };
    }
    
    console.log('[Confirmation] ✅ Disponibilidad confirmada:', availability.message);
    
    // 2. Crear la reserva oficialmente
    const reservationResult = await createReservation(pendingReservation);
    
    if (!reservationResult.success) {
      return {
        success: false,
        message: `❌ No pude confirmar tu reserva: ${reservationResult.error}`,
        needsAction: false
      };
    }
    
    // 2. Crear evento en Google Calendar
    console.log('[Confirmation] 📅 Creando evento en Google Calendar...');
    try {
      const calendarEvent = await createCalendarEvent({
        userName: pendingReservation.userName,
        email: userProfile.email || 'noemail@coworkia.com',
        date: pendingReservation.date,
        startTime: pendingReservation.startTime,
        endTime: pendingReservation.endTime,
        serviceType: pendingReservation.serviceType,
        duration: `${pendingReservation.durationHours} horas`,
        price: pendingReservation.totalPrice,
        guestCount: pendingReservation.guestCount || 0
      });
      
      if (calendarEvent.success) {
        console.log('[Confirmation] ✅ Evento creado en Google Calendar:', calendarEvent.eventUrl);
      } else {
        console.error('[Confirmation] ❌ Error creando evento en Google Calendar:', calendarEvent.error);
      }
    } catch (calendarError) {
      console.error('[Confirmation] ❌ Error con Google Calendar:', calendarError);
    }

    // 3. Actualizar perfil del usuario
    await updateUser(userProfile.userId, {
      pendingConfirmation: null,
      lastReservation: reservationResult.reservation
    });

    // 4. Si es gratis, enviar email y confirmar
    if (pendingReservation.wasFree) {
      console.log('[Confirmation] 🔍 DEBUG: Reserva gratis detectada, intentando enviar email');
      console.log('[Confirmation] 🔍 DEBUG: Email usuario:', userProfile.email);
      
      try {
        if (userProfile.email) {
          console.log('[Confirmation] 📧 Enviando email de confirmación gratuita...');
          
          // Formato correcto para sendReservationConfirmation con acompañantes
          const emailResult = await sendReservationConfirmation({
            email: userProfile.email,
            userName: userProfile.name || 'Cliente',
            date: pendingReservation.date,
            startTime: pendingReservation.startTime,
            endTime: pendingReservation.endTime,
            serviceType: pendingReservation.serviceType || 'Hot Desk',
            guestCount: pendingReservation.guestCount || 0, // Número de acompañantes
            wasFree: true,
            durationHours: 2,
            total: 0
          });
          
          if (emailResult.success) {
            console.log('[Confirmation] ✅ Email de confirmación enviado exitosamente');
          } else {
            console.error('[Confirmation] ❌ Error enviando email:', emailResult.error);
          }
        } else {
          console.warn('[Confirmation] ⚠️ Email no enviado: usuario sin email configurado');
        }
      } catch (emailError) {
        console.error('[Confirmation] ❌ Error enviando email gratis:', emailError);
      }

      return {
        success: true,
        message: `✅ *¡Reserva confirmada${userName}!*

🎉 Tus 2 horas gratis están listas:

📅 *${pendingReservation.date}*
⏰ *${pendingReservation.startTime} - ${pendingReservation.endTime}*

📧 Te he enviado la confirmación por email.

📍 *Ubicación:* Whymper 403, Edificio Finistere
🗺️ https://maps.app.goo.gl/ZrKqKw8vBm2eZeK69

¡Te esperamos! 🚀`,
        needsAction: false,
        reservation: reservationResult.reservation
      };
    }

    // 4. Si requiere pago, enviar datos de pago
    const paymentInfo = getPaymentInfo();
    
    return {
      success: true,
      message: `✅ *¡Reserva confirmada${userName}!*

💳 *DATOS PARA EL PAGO:*

💰 *Total:* $${pendingReservation.totalPrice} USD
🔢 *Referencia:* ${reservationResult.reservation.id}

*💳 PAYPHONE (recomendado):*
👉 https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA

*🏦 TRANSFERENCIA BANCARIA:*
👉 Banco Pichincha
👉 Cuenta: 2207158516
👉 Nombre: Coworkia

⚠️ *Importante:* Después de pagar, envíame una captura de pantalla del comprobante para confirmar automáticamente.

¿Listo para pagar? 🚀`,
      needsAction: true,
      actionType: 'payment_pending',
      reservation: reservationResult.reservation
    };

  } catch (error) {
    console.error('[Confirmation] Error procesando confirmación positiva:', error);
    return {
      success: false,
      message: '❌ Error interno procesando la confirmación. Intenta nuevamente.',
      needsAction: false
    };
  }
}

/**
 * ❌ Procesa confirmación negativa
 */
export async function processNegativeConfirmation(userProfile) {
  const userName = userProfile.name ? `, ${userProfile.name}` : '';
  
  // Limpiar confirmación pendiente
  await updateUser(userProfile.userId, {
    pendingConfirmation: null
  });

  return {
    success: true,
    message: `Entendido${userName} 👍

❌ He cancelado la reserva pendiente.

¿En qué más puedo ayudarte?

• Otra fecha/hora
• Información de espacios  
• Planes mensuales

¡Estoy aquí para lo que necesites! 😊`,
    needsAction: false,
    actionType: 'reservation_cancelled'
  };
}

/**
 * 🤔 Maneja respuestas ambiguas o no reconocidas
 */
export function processAmbiguousResponse(userProfile, message) {
  const userName = userProfile.name ? `, ${userProfile.name}` : '';
  
  return {
    success: false,
    message: `No estoy seguro de tu respuesta${userName} 🤔

Por favor responde claramente:

• *SI* - para confirmar la reserva
• *NO* - para cancelar

Tu mensaje: "${message}"

¿Confirmas la reserva? 👍`,
    needsAction: true,
    actionType: 'confirmation_clarification'
  };
}

/**
 * 🎛️ Procesador principal de confirmaciones
 */
export async function processConfirmationResponse(message, userProfile) {
  try {
    const pendingConfirmation = userProfile.pendingConfirmation;
    
    if (!pendingConfirmation) {
      return {
        success: false,
        message: 'No tienes ninguna reserva pendiente de confirmación.',
        needsAction: false
      };
    }

    // Detectar tipo de respuesta
    if (isPositiveResponse(message)) {
      return await processPositiveConfirmation(userProfile, pendingConfirmation);
    }
    
    if (isNegativeResponse(message)) {
      return processNegativeConfirmation(userProfile);
    }
    
    // Respuesta ambigua
    return processAmbiguousResponse(userProfile, message);

  } catch (error) {
    console.error('[Confirmation] Error procesando respuesta:', error);
    return {
      success: false,
      message: '❌ Error procesando tu respuesta. Intenta nuevamente.',
      needsAction: false
    };
  }
}

/**
 * 🔍 Verifica si el usuario tiene confirmación pendiente
 */
export function hasPendingConfirmation(userProfile) {
  return !!(userProfile?.pendingConfirmation);
}

export default {
  isPositiveResponse,
  isNegativeResponse,
  generateConfirmationMessage,
  processConfirmationResponse,
  hasPendingConfirmation,
  processPositiveConfirmation,
  processNegativeConfirmation,
  processAmbiguousResponse
};