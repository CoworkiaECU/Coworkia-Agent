/**
 * 📧 Helper para reenviar confirmaciones de reservas existentes
 */

import { sendReservationConfirmation } from './email.js';
import reservationRepository from '../database/reservationRepository.js';

/**
 * 🔍 Detecta si el usuario pide reenviar la confirmación
 */
export function detectResendConfirmationRequest(message) {
  const msg = message.toLowerCase();
  
  const keywords = [
    'reenviar',
    're-enviar',
    'volver a enviar',
    'enviar nuevamente',
    'envía.*confirmación',
    'enviar.*confirmación',
    'envíame.*confirmación',
    'manda.*confirmación',
    'mandar.*confirmación',
    'envía.*correo',
    'enviar.*email',
    'confirmación.*correo',
    'confirmación.*email'
  ];
  
  return keywords.some(keyword => {
    const regex = new RegExp(keyword, 'i');
    return regex.test(msg);
  });
}

/**
 * 📨 Reenvía la confirmación de la última reserva del usuario
 */
export async function resendLastReservationConfirmation(userPhone, userEmail) {
  try {
    console.log(`[RESEND] 📧 Buscando última reserva de ${userPhone}...`);
    
    // Buscar reservas del usuario (ordenadas por fecha desc)
    const reservations = await reservationRepository.findByUser(userPhone, 5);
    
    if (!reservations || reservations.length === 0) {
      console.log('[RESEND] ❌ No se encontraron reservas');
      return {
        success: false,
        error: 'no_reservations',
        message: 'No encontré reservas registradas a tu nombre. ¿Necesitas hacer una nueva reserva?'
      };
    }
    
    // Buscar la reserva más reciente que esté confirmada o futura
    const today = new Date().toISOString().split('T')[0];
    const validReservation = reservations.find(r => 
      r.status === 'confirmed' && r.date >= today
    ) || reservations[0]; // Si no hay futuras, tomar la más reciente
    
    console.log(`[RESEND] ✅ Reserva encontrada: ${validReservation.id}`);
    console.log(`[RESEND]    Fecha: ${validReservation.date}, Estado: ${validReservation.status}`);
    
    // Validar que tengamos email
    if (!userEmail && !validReservation.user_email) {
      console.log('[RESEND] ❌ No hay email registrado');
      return {
        success: false,
        error: 'no_email',
        message: '¿A qué correo electrónico te lo envío? No tengo un email registrado para ti.'
      };
    }
    
    const emailToUse = userEmail || validReservation.user_email;
    
    // Preparar datos para el email
    const emailData = {
      userName: validReservation.user_name || 'Cliente',
      userEmail: emailToUse,
      date: validReservation.date,
      startTime: validReservation.start_time,
      endTime: validReservation.end_time,
      durationHours: validReservation.duration_hours,
      serviceType: validReservation.service_type,
      wasFree: validReservation.was_free,
      totalPrice: validReservation.total_price,
      guestCount: validReservation.guest_count || 0,
      reservation: validReservation
    };
    
    console.log(`[RESEND] 📤 Enviando confirmación a ${emailToUse}...`);
    
    // Reenviar el email
    const result = await sendReservationConfirmation(emailData);
    
    if (result.success) {
      console.log('[RESEND] ✅ Email reenviado exitosamente');
      
      // Formatear fecha para el mensaje
      const dateObj = new Date(validReservation.date);
      const formattedDate = dateObj.toLocaleDateString('es-EC', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      
      return {
        success: true,
        reservation: validReservation,
        message: `¡Listo! 📧 Te he reenviado la confirmación a *${emailToUse}*\n\n` +
                 `📅 Reserva: ${formattedDate}\n` +
                 `⏰ Horario: ${validReservation.start_time} - ${validReservation.end_time}\n` +
                 `🏢 Espacio: ${validReservation.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones'}\n\n` +
                 `Revisa tu bandeja de entrada (y spam por si acaso) 😊`
      };
    } else {
      console.log('[RESEND] ❌ Error enviando email:', result.error);
      return {
        success: false,
        error: 'send_failed',
        message: 'Tuve un problema al enviar el email. ¿Puedes verificar que tu correo esté correcto? El email que tengo es: ' + emailToUse
      };
    }
    
  } catch (error) {
    console.error('[RESEND] ❌ Error:', error);
    return {
      success: false,
      error: 'system_error',
      message: 'Hubo un error al procesar tu solicitud. Por favor intenta nuevamente en un momento.'
    };
  }
}

/**
 * 📋 Genera mensaje con el ticket/resumen de la reserva
 */
export function generateReservationTicket(reservation) {
  const dateObj = new Date(reservation.date);
  const formattedDate = dateObj.toLocaleDateString('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const serviceType = reservation.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones';
  const price = reservation.was_free ? 'GRATIS (primera visita)' : `$${parseFloat(reservation.total_price).toFixed(2)}`;
  
  const guestInfo = reservation.guest_count > 0 ? 
    `\n👥 *Personas:* ${1 + reservation.guest_count} (tú + ${reservation.guest_count} acompañante${reservation.guest_count > 1 ? 's' : ''})` : 
    '';
  
  return `🎫 *TU RESERVA CONFIRMADA*

📅 *Fecha:* ${formattedDate}
⏰ *Horario:* ${reservation.start_time} - ${reservation.end_time}
🏢 *Espacio:* ${serviceType}${guestInfo}
⏱️ *Duración:* ${reservation.duration_hours} hora${reservation.duration_hours > 1 ? 's' : ''}
💰 *Precio:* ${price}

📍 *Ubicación:*
Edificio Finistere - Planta Baja
Whymper 403, Quito

🗺️ Ver mapa: https://maps.app.goo.gl/Nqy6YeGuxo3czEt66

${reservation.status === 'pending_payment' ? '⚠️ *Pendiente de pago*' : '✅ *Confirmada*'}`;
}

export default {
  detectResendConfirmationRequest,
  resendLastReservationConfirmation,
  generateReservationTicket
};
