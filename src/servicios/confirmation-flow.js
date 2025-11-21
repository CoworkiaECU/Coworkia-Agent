/**
 * 🔄 Servicio de Confirmaciones SI/NO para WhatsApp
 * Maneja flujos de confirmación de reservas antes del pago
 */

import { loadProfile, saveProfile, updateUser } from '../perfiles-interacciones/memoria-sqlite.js';
import { getPaymentInfo } from './payment-calculator.js';
import { createReservation } from './calendario.js';
import { sendReservationConfirmation } from './email.js';
import { createCalendarEvent } from './google-calendar.js';
import databaseService from '../database/database.js';
import { enqueueBackgroundTask } from './task-queue.js';
import { clearPendingConfirmation } from '../perfiles-interacciones/memoria-sqlite.js';
import { markJustConfirmed } from './reservation-state.js';
import reservationRepository from '../database/reservationRepository.js';
import { sendReservationNotifications } from './notification-helper.js';

class ConfirmationFlowError extends Error {
  constructor(payload) {
    super(payload?.message || 'CONFIRMATION_FLOW_ERROR');
    this.payload = payload;
  }
}

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
    /olv[ií]dalo/,
    /olvidalo/,
    /ya no quiero/,
    /no me interesa/,
    /abandonar/,
    /eliminar/,
    /borrar/,
    /^no gracias$/,
    /^no, gracias$/,
    /^gracias pero no$/,
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
 * 🔄 Detecta intención de modificar/cambiar reserva (no cancelar)
 */
export function isModificationRequest(message) {
  if (!message || typeof message !== 'string') return false;
  
  const text = message.toLowerCase().trim();
  
  // Patrones que indican que quiere mantener la reserva pero modificarla
  const modificationPatterns = [
    /cambiar/,
    /modificar/,
    /editar/,
    /ajustar/,
    /otro horario/,
    /otra hora/,
    /otra fecha/,
    /diferente hora/,
    /diferente fecha/,
    /puedo.*otro/,
    /mejor.*otro/,
    /prefiero.*otro/,
    /en vez de/,
    /en lugar de/,
    /más tarde/,
    /más temprano/
  ];
  
  return modificationPatterns.some(pattern => pattern.test(text));
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
    return `Perfecto${userName}! 👍

📋 *Resumen de tu visita:*

📅 ${formattedDate}
⏰ ${startTime} - ${endTime} 
🏢 ${serviceName}
${peopleInfo}
⏱️ ${durationHours} hora${durationHours > 1 ? 's' : ''}
💰 Sin costo (primera visita)

¿Te viene bien este horario?

Responde *SI* para confirmar o *NO* si prefieres otro horario.`;
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
    console.log('[Confirmation] 🔍 INICIO - processPositiveConfirmation con datos:', {
      userProfile: {
        userId: userProfile?.userId,
        name: userProfile?.name,
        email: userProfile?.email
      },
      pendingReservation: {
        userId: pendingReservation?.userId,
        date: pendingReservation?.date,
        startTime: pendingReservation?.startTime,
        serviceType: pendingReservation?.serviceType,
        wasFree: pendingReservation?.wasFree,
        paymentMethod: pendingReservation?.paymentMethod
      }
    });
    
    const userName = userProfile.name ? `, ${userProfile.name}` : '';
    let reservationRecord = null;
    
    // 🚨 CRÍTICO: Asegurar que pendingReservation tenga el userId (usado como user_phone)
    if (!pendingReservation.userId && userProfile.userId) {
      pendingReservation.userId = userProfile.userId;
      console.log('[Confirmation] ✅ userId agregado desde userProfile:', pendingReservation.userId);
    }
    
    // Agregar userName si existe
    if (!pendingReservation.userName && userProfile.name) {
      pendingReservation.userName = userProfile.name;
    }
    
    // 🔍 VALIDACIÓN: Verificar disponibilidad de Hot Desks ANTES de confirmar
    if (pendingReservation.serviceType === 'hotDesk') {
      console.log('[Confirmation] 📍 PASO 1: Verificando disponibilidad de Hot Desk...');
      const { checkHotDeskAvailability, assignHotDeskNumber } = await import('./calendario.js');
      
      const availability = await checkHotDeskAvailability(
        pendingReservation.date,
        pendingReservation.startTime,
        pendingReservation.endTime
      );
      
      console.log('[Confirmation] 📊 Disponibilidad verificada:', availability);
      
      if (!availability.available) {
        console.log('[Confirmation] ❌ Hot Desks agotados:', availability);
        
        // TODO: Aurora debe ofrecer alternativas (siguiente slot disponible o día siguiente)
        throw new ConfirmationFlowError({
          success: false,
          message: `${availability.message}\n\nDéjame revisar otros horarios disponibles...`,
          needsAction: true,
          actionType: 'check_alternatives'
        });
      }
      
      // Asignar número de Hot Desk automáticamente
      const hotDeskNumber = await assignHotDeskNumber(
        pendingReservation.date,
        pendingReservation.startTime,
        pendingReservation.endTime
      );
      
      pendingReservation.hotDeskNumber = hotDeskNumber;
      console.log(`[Confirmation] ✅ Hot Desk asignado: ${hotDeskNumber}/6`);
    }
    
    // 🔄 Crear reserva
    console.log('[Confirmation] 📍 PASO 2: Creando reserva...');
    const reservationResult = await createReservation(pendingReservation);
    
    console.log('[Confirmation] 📊 Resultado de createReservation:', reservationResult);
    
    if (!reservationResult.success) {
      console.error('[Confirmation] ❌ createReservation falló:', reservationResult.error);
      throw new ConfirmationFlowError({
        success: false,
        message: `❌ ${reservationResult.error}`,
        needsAction: false,
        alternatives: reservationResult.alternatives
      });
    }

    reservationRecord = reservationResult.reservation;
    console.log('[Confirmation] ✅ Reserva creada con ID:', reservationRecord?.id);

    if (!pendingReservation.wasFree) {
      console.log('[Confirmation] 📍 PASO 2.2: Actualizando estado a pending_payment...');
      reservationRecord = await reservationRepository.updateStatus(reservationRecord.id, 'pending_payment');
    } else {
      // 🎁 Reserva gratis: marcar como confirmada inmediatamente
      console.log('[Confirmation] 📍 PASO 2.2: Reserva gratis - actualizando estado a confirmed...');
      reservationRecord = await reservationRepository.updateStatus(reservationRecord.id, 'confirmed');
      console.log('[Confirmation] ✅ Reserva gratis confirmada automáticamente');
    }

    console.log('[Confirmation] 📍 PASO 2.3: Limpiando confirmación pendiente...');
    await clearPendingConfirmation(userProfile.userId);
    
    console.log('[Confirmation] 📍 PASO 2.4: Actualizando perfil de usuario...');
    const userUpdates = {
      lastReservation: reservationRecord
    };
    
    // 🎁 Si es primera reserva gratis, marcar trial usado
    if (pendingReservation.wasFree) {
      console.log('[Confirmation] 🎁 Marcando trial gratis como usado');
      userUpdates.free_trial_used = true;
      userUpdates.free_trial_date = new Date().toISOString();
    }
    
    await updateUser(userProfile.userId, userUpdates);
    
    console.log('[Confirmation] ✅ Operaciones completadas exitosamente');

    console.log('[Confirmation] 📍 PASO 3: Marcando como confirmado recientemente...');
    await markJustConfirmed(userProfile.userId, reservationRecord?.id);

    const confirmedDate = reservationRecord?.date || pendingReservation.date;
    const confirmedStart = reservationRecord?.startTime || pendingReservation.startTime;
    const confirmedEnd = reservationRecord?.endTime || pendingReservation.endTime;
    
    console.log('[Confirmation] 📋 Datos confirmados:', { confirmedDate, confirmedStart, confirmedEnd });

    // 2. Crear evento en Google Calendar (SOLO UNA VEZ)
    // ⚠️ NO duplicar: sendReservationNotifications ya crea el evento inline
    // Solo encolar si NO es gratis (las gratis se envían inline abajo)
    if (!pendingReservation.wasFree) {
      enqueueBackgroundTask(
        'calendar-events',
        'create-reservation',
        () => createCalendarEvent({
          userName: pendingReservation.userName,
          email: userProfile.email || 'noemail@coworkia.com',
          date: confirmedDate,
          startTime: confirmedStart,
          endTime: confirmedEnd,
          serviceType: pendingReservation.serviceType,
          duration: `${pendingReservation.durationHours} horas`,
          price: pendingReservation.totalPrice,
          guestCount: pendingReservation.guestCount || 0
        }),
        { circuitId: 'calendar-events-job' }
      )
        .then(calendarEvent => {
          if (calendarEvent?.success) {
            console.log('[Confirmation] ✅ Evento en Google Calendar en background:', calendarEvent.eventUrl);
          } else {
            console.error('[Confirmation] ❌ Calendario reportó error:', calendarEvent?.error || 'Unknown');
          }
        })
        .catch(calendarError => {
          console.error('[Confirmation] ❌ Error creando evento en background:', calendarError);
        });
    }

    // 4. Si es gratis, enviar email y calendar INLINE (no encolar)
    if (pendingReservation.wasFree) {
      console.log('[Confirmation] 🔍 DEBUG: Reserva gratis detectada, enviando notificaciones INLINE');
      console.log('[Confirmation] 🔍 DEBUG: Email usuario:', userProfile.email);
      console.log('[Confirmation] 🔍 DEBUG: Datos reserva:', {
        date: confirmedDate,
        startTime: confirmedStart,
        endTime: confirmedEnd,
        serviceType: pendingReservation.serviceType,
        wasFree: true
      });
      
      if (userProfile.email) {
        console.log('[Confirmation] 📧 Enviando notificaciones INLINE (email + calendar)...');
        
        try {
          // EJECUTAR INLINE con reintentos automáticos
          const notificationResults = await sendReservationNotifications({
            email: userProfile.email,
            userName: userProfile.name || 'Cliente',
            date: confirmedDate,
            startTime: confirmedStart,
            endTime: confirmedEnd,
            serviceType: pendingReservation.serviceType || 'hotDesk',
            guestCount: pendingReservation.guestCount || 0,
            wasFree: true,
            durationHours: pendingReservation.durationHours || 2,
            totalPrice: 0,
            reservation: reservationRecord
          });
          
          // Log detallado de resultados
          console.log('[Confirmation] 📊 Resultado notificaciones:', JSON.stringify(notificationResults, null, 2));
          
          if (notificationResults.bothSucceeded) {
            console.log('[Confirmation] ✅ AMBAS notificaciones enviadas exitosamente (email + calendar)');
          } else if (notificationResults.anySucceeded) {
            console.warn('[Confirmation] ⚠️ PARCIAL: Solo algunas notificaciones se enviaron:', {
              email: notificationResults.email?.success ? 'OK' : 'FAILED',
              calendar: notificationResults.calendar?.success ? 'OK' : 'FAILED'
            });
          } else {
            console.error('[Confirmation] 🚨 CRÍTICO: NINGUNA notificación se envió - Revisión manual requerida');
          }
        } catch (notifError) {
          console.error('[Confirmation] ❌ ERROR al enviar notificaciones:', notifError.message);
          console.error('[Confirmation] Stack:', notifError.stack);
        }
      } else {
        console.warn('[Confirmation] ⚠️ Email no enviado: usuario sin email configurado');
      }

      return {
        success: true,
        message: `✅ *¡Reserva confirmada${userName}!*

🎉 Tus 2 horas gratis están listas:

📅 *${confirmedDate}*
⏰ *${confirmedStart} - ${confirmedEnd}*
💰 *Precio:* ¡GRATIS! (primera visita)

📧 Te he enviado la confirmación por email.

📍 *Ubicación:* Whymper 403, Edificio Finistere
🗺️ https://maps.app.goo.gl/Nqy6YeGuxo3czEt66

¡Te esperamos! 🚀`,
        needsAction: false,
        reservation: reservationRecord
      };
    }

    // 🔓 BYPASS: Si es efectivo, confirmar directamente sin pagar (temporal)
    if (pendingReservation.paymentMethod === 'efectivo') {
      console.log('[Confirmation] 🔓 BYPASS: Efectivo detectado, confirmando sin pago');
      
      // Marcar como pagado directamente
      await reservationRepository.markAsPaid(reservationRecord.id, {
        payment_method: 'efectivo',
        payment_reference: 'PAGO_EN_COWORKIA',
        payment_amount: pendingReservation.totalPrice,
        payment_date: new Date().toISOString()
      });
      
      // Enviar notificaciones
      if (userProfile.email) {
        await sendReservationNotifications({
          email: userProfile.email,
          userName: userProfile.name || 'Cliente',
          date: confirmedDate,
          startTime: confirmedStart,
          endTime: confirmedEnd,
          serviceType: pendingReservation.serviceType || 'Hot Desk',
          guestCount: pendingReservation.guestCount || 0,
          wasFree: false,
          durationHours: pendingReservation.durationHours || 2,
          totalPrice: pendingReservation.totalPrice,
          reservation: reservationRecord
        });
      }
      
      return {
        success: true,
        message: `✅ *¡Reserva confirmada${userName}!* 🎉

📅 *${confirmedDate}*
⏰ *${confirmedStart} - ${confirmedEnd}*
🏢 *${pendingReservation.serviceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones'}*
💰 *Pago pendiente:* $${pendingReservation.totalPrice} (efectivo en Coworkia)

✅ Pagarás directamente al llegar

📧 Te he enviado la confirmación por email.

📍 *Ubicación:* Whymper 403, Edificio Finistere
🗺️ https://maps.app.goo.gl/Nqy6YeGuxo3czEt66

¡Te esperamos! 🚀`,
        needsAction: false,
        reservation: reservationRecord
      };
    }
    
    // 4. Si requiere pago, enviar datos de pago
    const paymentInfo = getPaymentInfo(
      userProfile, 
      pendingReservation.serviceType, 
      pendingReservation.durationHours
    );
    
    return {
      success: true,
      message: `✅ *¡Reserva confirmada${userName}!* 🎉

📅 *${confirmedDate}*
⏰ *${confirmedStart} - ${confirmedEnd}*
🏢 *${pendingReservation.serviceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones'}*

💰 *Total a pagar:* $${pendingReservation.totalPrice}
🔢 *Referencia:* ${reservationRecord.id}

*Opciones de pago:*

💳 *PAYPHONE* (inmediato):
https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA

🏦 *TRANSFERENCIA:*
Produbanco 20059783069
Gonzalo Villota (1702683499)

📲 Envíame tu comprobante y confirmo automáticamente.

📍 Whymper 403, Edificio Finistere
🗺️ https://maps.app.goo.gl/Nqy6YeGuxo3czEt66`,
      needsAction: true,
      actionType: 'payment_pending',
      reservation: reservationRecord
    };

  } catch (error) {
    if (error instanceof ConfirmationFlowError) {
      return error.payload;
    }
    
    // 🚨 LOG CRÍTICO CON CONTEXTO COMPLETO
    console.error('[Confirmation] 🚨 ERROR CRÍTICO procesando confirmación positiva:', {
      error: error.message,
      stack: error.stack,
      userId: userProfile?.userId || 'unknown',
      pendingReservationExists: !!pendingReservation,
      userProfileExists: !!userProfile,
      pendingReservationDetails: pendingReservation ? {
        date: pendingReservation.date,
        time: pendingReservation.startTime,
        serviceType: pendingReservation.serviceType,
        email: pendingReservation.email,
        wasFree: pendingReservation.wasFree
      } : 'none',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: `❌ Hubo un problema al procesar tu confirmación.\n\n⚠️ Error: ${error.message}\n\n¿Puedes intentar de nuevo escribiendo *SI*?`,
      needsAction: false
    };
  }
}

/**
 * ❌ Procesa confirmación negativa
 */
export async function processNegativeConfirmation(userProfile, message = '') {
  const userName = userProfile.name ? `, ${userProfile.name}` : '';
  
  // Detectar si quiere cambiar o realmente cancelar
  const wantsToModify = isModificationRequest(message);
  
  // Limpiar confirmación pendiente
  await updateUser(userProfile.userId, {
    pendingConfirmation: null
  });
  
  // Marcar que acaba de cancelar para evitar re-procesamiento de campañas
  try {
    await databaseService.initialize();
    // Borrar registro existente primero
    await databaseService.run(
      `DELETE FROM just_confirmed WHERE user_phone = ?`,
      [userProfile.userId]
    );
    // Calcular timestamp de expiración (5 minutos desde ahora)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    // Insertar nuevo registro con expiración en 5 minutos
    await databaseService.run(
      `INSERT INTO just_confirmed (user_phone, expires_at) 
       VALUES (?, ?)`,
      [userProfile.userId, expiresAt]
    );
  } catch (err) {
    console.error('[Confirmation] Error marcando justConfirmed en cancelación:', err);
  }

  if (wantsToModify) {
    return {
      success: true,
      message: `Entiendo${userName}. Si decides continuar con tu reserva, ¿qué espacio necesitas? Tenemos:

📍 Hot Desk
🏢 Sala de Reuniones (3-4 personas, $29/2h)

Déjame saber cómo te gustaría proceder. 😊`,
      needsAction: false,
      actionType: 'reservation_modification'
    };
  }

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
export async function processAmbiguousResponse(userProfile, message) {
  const userName = userProfile.name ? `, ${userProfile.name}` : '';
  
  // Incrementar contador de intentos ambiguos
  const ambiguousAttempts = (userProfile.pendingConfirmation?.ambiguousAttempts || 0) + 1;
  
  // Si ya intentó 3 veces, auto-cancelar
  if (ambiguousAttempts >= 3) {
    clearPendingConfirmation(userProfile.userId);
    
    // Marcar que acaba de cancelar para evitar re-procesamiento de campañas
    try {
      await databaseService.initialize();
      // Borrar registro existente primero
      await databaseService.run(
        `DELETE FROM just_confirmed WHERE user_phone = ?`,
        [userProfile.userId]
      );
      // Calcular timestamp de expiración (5 minutos desde ahora)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      // Insertar nuevo registro con expiración en 5 minutos
      await databaseService.run(
        `INSERT INTO just_confirmed (user_phone, expires_at) 
         VALUES (?, ?)`,
        [userProfile.userId, expiresAt]
      );
    } catch (err) {
      console.error('[Confirmation] Error marcando justConfirmed:', err);
    }
    
    return {
      success: false,
      message: `Entiendo que prefieres no confirmar ahora${userName}.

✅ He cancelado la reserva pendiente.

¿Quieres agendar para otra fecha u horario? Avísame cuando quieras 😊`,
      needsAction: false,
      actionType: 'auto_cancelled_after_attempts'
    };
  }
  
  // Actualizar contador en pending confirmation
  try {
    await databaseService.initialize();
    // Actualizar el contador de intentos ambiguos en la confirmación pendiente
    const pending = await getPendingConfirmation(userProfile.userId);
    if (pending) {
      const updatedData = { ...pending, ambiguousAttempts };
      await setPendingConfirmation(userProfile.userId, updatedData, pending.expiresAt);
    }
  } catch (err) {
    console.error('[Confirmation] Error actualizando contador:', err);
  }
  
  return {
    success: false,
    message: `No estoy seguro de tu respuesta${userName} 🤔

Por favor responde claramente:

• *SI* - para confirmar la reserva
• *NO* - para cancelar

Tu mensaje: "${message}"

¿Confirmas la reserva? 👍

_(Intento ${ambiguousAttempts}/3)_`,
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
      return await processNegativeConfirmation(userProfile, message);
    }
    
    // Respuesta ambigua
    return await processAmbiguousResponse(userProfile, message);

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
