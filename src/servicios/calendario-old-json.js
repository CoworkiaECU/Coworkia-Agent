// Sistema de Calendario para Coworkia
// Maneja disponibilidad, reservas y límites de espacios

import reservationRepository from '../database/reservationRepository.js';

/**
 * 📅 Configuración del calendario
 */
const CALENDAR_CONFIG = {
  maxSimultaneousSpaces: 6, // Máximo 6 espacios al mismo tiempo
  workingHours: {
    start: 7, // 7:00 AM
    end: 20   // 8:00 PM
  },
  timeSlots: 60, // Slots de 60 minutos
  availableSpaces: ['hotDesk1', 'hotDesk2', 'hotDesk3', 'hotDesk4', 'meetingRoom1', 'privateOffice1']
};

/**
 * 🕐 Convierte string de hora "14:30" a minutos desde medianoche
 */
function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * 🕐 Convierte minutos desde medianoche a string "14:30"
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * 🔍 Verifica disponibilidad para una fecha y horario específico
 */
export async function checkAvailability(date, startTime, durationHours, serviceType = 'hotDesk') {
  const reservations = await reservationRepository.findByDate(date);
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + (durationHours * 60);
  
  // Verificar horario laboral
  const workStart = CALENDAR_CONFIG.workingHours.start * 60;
  const workEnd = CALENDAR_CONFIG.workingHours.end * 60;
  
  if (startMinutes < workStart || endMinutes > workEnd) {
    return {
      available: false,
      reason: 'Fuera del horario laboral (7:00 AM - 8:00 PM)',
      alternatives: await suggestAlternatives(date, durationHours)
    };
  }
  
  // Contar espacios ocupados en ese momento
  const overlappingReservations = reservations.filter(res => {
    if (res.status === 'cancelled') return false;
    
    const resStart = timeToMinutes(res.start_time);
    const resEnd = timeToMinutes(res.end_time);
    
    // Verificar solapamiento
    return !(endMinutes <= resStart || startMinutes >= resEnd);
  });
  
  if (overlappingReservations.length >= CALENDAR_CONFIG.maxSimultaneousSpaces) {
    return {
      available: false,
      reason: `Máximo ${CALENDAR_CONFIG.maxSimultaneousSpaces} espacios ocupados en ese horario`,
      occupiedSpaces: overlappingReservations.length,
      alternatives: await suggestAlternatives(date, durationHours)
    };
  }
  
  return {
    available: true,
    occupiedSpaces: overlappingReservations.length,
    availableSpaces: CALENDAR_CONFIG.maxSimultaneousSpaces - overlappingReservations.length
  };
}

/**
 * 💡 Sugiere horarios alternativos si no hay disponibilidad
 */
async function suggestAlternatives(date, durationHours) {
  const alternatives = [];
  
  // Buscar horarios libres el mismo día (evitar recursión infinita)
  for (let hour = CALENDAR_CONFIG.workingHours.start; hour <= CALENDAR_CONFIG.workingHours.end - durationHours; hour++) {
    const testTime = `${hour.toString().padStart(2, '0')}:00`;
    const reservations = await reservationRepository.findByDate(date);
    const startMinutes = timeToMinutes(testTime);
    const endMinutes = startMinutes + (durationHours * 60);
    
    const overlapping = reservations.filter(res => {
      if (res.status === 'cancelled') return false;
      const resStart = timeToMinutes(res.start_time);
      const resEnd = timeToMinutes(res.end_time);
      return !(endMinutes <= resStart || startMinutes >= resEnd);
    });
    
    if (overlapping.length < CALENDAR_CONFIG.maxSimultaneousSpaces && alternatives.length < 3) {
      alternatives.push({
        date,
        time: testTime,
        duration: `${durationHours}h`
      });
    }
  }
  
  // Si no hay alternativas el mismo día, sugerir día siguiente
  if (alternatives.length === 0) {
    const nextDate = getNextDate(date);
    const testTime = '09:00';
    const reservations = await reservationRepository.findByDate(nextDate);
    
    if (reservations.length < CALENDAR_CONFIG.maxSimultaneousSpaces) {
      alternatives.push({
        date: nextDate,
        time: testTime,
        duration: `${durationHours}h`,
        note: 'Día siguiente disponible'
      });
    }
  }
  
  return alternatives;
}

/**
 * 📅 Obtiene la fecha del día siguiente
 */
function getNextDate(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * ➕ Crea una nueva reserva
 */
export async function createReservation(reservationData) {
  const {
    userId,
    userName,
    date,
    startTime,
    durationHours,
    serviceType = 'hotDesk',
    wasFree = false,
    email = null,
    total = 0,
    guestCount = 1
  } = reservationData;
  
  // Verificar disponibilidad primero
  const availability = await checkAvailability(date, startTime, durationHours, serviceType);
  if (!availability.available) {
    return {
      success: false,
      error: availability.reason,
      alternatives: availability.alternatives
    };
  }
  
  const endTime = minutesToTime(timeToMinutes(startTime) + (durationHours * 60));
  
  try {
    const newReservation = await reservationRepository.create({
      user_phone: userId,
      user_name: userName,
      service_type: serviceType,
      reservation_date: date,
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationHours,
      guest_count: guestCount,
      total_amount: total,
      status: 'pending',
      was_free_trial: wasFree ? 1 : 0,
      user_email: email
    });
    
    return {
      success: true,
      reservation: {
        id: newReservation.id,
        userId,
        userName,
        date,
        startTime,
        endTime,
        durationHours,
        serviceType,
        status: 'pending',
        wasFree,
        email,
        total,
        guestCount,
        createdAt: newReservation.created_at
      },
      message: `Reserva creada: ${date} de ${startTime} a ${endTime} (${durationHours}h)`
    };
  } catch (error) {
    console.error('[CALENDARIO] Error creando reserva:', error);
    return {
      success: false,
      error: 'Error guardando la reserva'
    };
  }
}

/**
 * ✅ Confirma una reserva existente
 */
export async function confirmReservation(reservationId) {
  try {
    const reservation = await reservationRepository.findById(reservationId);
    
    if (!reservation) {
      return {
        success: false,
        error: 'Reserva no encontrada'
      };
    }
    
    if (reservation.status === 'confirmed') {
      return {
        success: true,
        message: 'Reserva ya estaba confirmada',
        reservation
      };
    }
    
    const updated = await reservationRepository.updateStatus(reservationId, 'confirmed');
    
    return {
      success: true,
      message: 'Reserva confirmada exitosamente',
      reservation: updated
    };
  } catch (error) {
    console.error('[CALENDARIO] Error confirmando reserva:', error);
    return {
      success: false,
      error: 'Error confirmando la reserva'
    };
  }
}

/**
 * ❌ Cancela una reserva
 */
export async function cancelReservation(reservationId, reason = 'Cancelada por usuario') {
  try {
    const reservation = await reservationRepository.findById(reservationId);
    
    if (!reservation) {
      return {
        success: false,
        error: 'Reserva no encontrada'
      };
    }
    
    const updated = await reservationRepository.updateStatus(reservationId, 'cancelled');
    
    return {
      success: true,
      message: 'Reserva cancelada',
      reservation: updated
    };
  } catch (error) {
    console.error('[CALENDARIO] Error cancelando reserva:', error);
    return {
      success: false,
      error: 'Error cancelando la reserva'
    };
  }
}

/**
 * 📋 Obtiene reservas de un usuario específico
 */
export async function getUserReservations(userId) {
  return await reservationRepository.findByUser(userId);
}

/**
 * � Actualiza información de pago de una reserva
 */
export async function updateReservationPayment(reservationId, paymentInfo) {
  const reservations = await loadReservations();
  const reservationIndex = reservations.findIndex(r => r.id === reservationId);
  
  if (reservationIndex === -1) {
    throw new Error(`Reserva ${reservationId} no encontrada`);
  }
  
  // Actualizar reserva con información de pago
  reservations[reservationIndex] = {
    ...reservations[reservationIndex],
    ...paymentInfo,
    updatedAt: new Date().toISOString()
  };
  
  const saved = await saveReservations(reservations);
  if (!saved) {
    throw new Error('Error guardando información de pago');
  }
  
  return reservations[reservationIndex];
}

/**
 * 🔍 Busca reserva por información de pago
 */
export async function getReservationByPaymentInfo(paymentData) {
  try {
    // Obtener reservas recientes (últimos 7 días)
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 7);
    
    const allReservations = await reservationRepository.findByUser(paymentData.userId);
    
    // Buscar por monto y fecha
    const matches = allReservations.filter(r => {
      if (r.status === 'cancelled' || r.payment_status === 'paid') return false;
      
      const amountMatch = Math.abs(parseFloat(r.total_amount) - parseFloat(paymentData.amount)) < 0.50;
      const dateMatch = r.created_at && paymentData.date && 
                       Math.abs(new Date(r.created_at) - new Date(paymentData.date)) < 24 * 60 * 60 * 1000;
      
      return amountMatch && dateMatch;
    });
    
    return matches.length > 0 ? matches[0] : null;
  } catch (error) {
    console.error('[CALENDARIO] Error buscando reserva por pago:', error);
    return null;
  }
}

/**
 * 📊 Obtiene estadísticas del día
 */
export async function getDayStats(date) {
  const reservations = await reservationRepository.findByDate(date);
  const dayReservations = reservations.filter(r => r.status !== 'cancelled');
  
  return {
    date,
    totalReservations: dayReservations.length,
    maxCapacity: CALENDAR_CONFIG.maxSimultaneousSpaces,
    occupancyRate: `${Math.round((dayReservations.length / CALENDAR_CONFIG.maxSimultaneousSpaces) * 100)}%`,
    reservations: dayReservations
  };
}

export default {
  checkAvailability,
  createReservation,
  confirmReservation,
  cancelReservation,
  getUserReservations,
  updateReservationPayment,
  getReservationByPaymentInfo,
  getDayStats,
  CALENDAR_CONFIG
};