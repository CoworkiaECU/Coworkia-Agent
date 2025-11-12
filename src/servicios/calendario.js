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

const SERVICE_NAMES = {
  hotDesk: 'Hot Desk',
  meetingRoom: 'Sala de Reuniones',
  privateOffice: 'Oficina Privada'
};

function parseCapacity(value, fallback = 1) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SERVICE_CAPACITY = {
  hotDesk: parseCapacity(process.env.COWORKIA_HOTDESK_CAPACITY, 1),
  meetingRoom: parseCapacity(process.env.COWORKIA_MEETINGROOM_CAPACITY, 1),
  privateOffice: parseCapacity(process.env.COWORKIA_PRIVATEOFFICE_CAPACITY, 1)
};

function getServiceCapacity(serviceType) {
  return SERVICE_CAPACITY[serviceType] > 0 ? SERVICE_CAPACITY[serviceType] : 1;
}

function getServiceName(serviceType) {
  return SERVICE_NAMES[serviceType] || 'Espacio';
}

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
  // 🌍 Validación timezone-aware: rechazar horarios pasados en Ecuador
  const nowEcuador = new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' });
  const currentDateTime = new Date(nowEcuador);
  const requestedDateTime = new Date(`${date}T${startTime}:00-05:00`); // Ecuador UTC-5
  
  if (requestedDateTime < currentDateTime) {
    console.log('[CALENDARIO] ⏰ Horario pasado detectado:', {
      requested: requestedDateTime.toISOString(),
      current: currentDateTime.toISOString()
    });
    
    // Sugerir próxima hora disponible
    const nextHour = currentDateTime.getHours() + 1;
    const nextTime = `${nextHour.toString().padStart(2, '0')}:00`;
    
    return {
      available: false,
      reason: 'Ese horario ya pasó',
      suggestion: `¿Qué tal ${nextTime}?`,
      alternatives: await suggestAlternatives(date, durationHours, serviceType)
    };
  }

  const reservations = await reservationRepository.findByDate(date, serviceType);
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + (durationHours * 60);
  
  // Verificar horario laboral
  const workStart = CALENDAR_CONFIG.workingHours.start * 60;
  const workEnd = CALENDAR_CONFIG.workingHours.end * 60;
  
  if (startMinutes < workStart || endMinutes > workEnd) {
    return {
      available: false,
      reason: 'Fuera del horario laboral (7:00 AM - 8:00 PM)',
      alternatives: await suggestAlternatives(date, durationHours, serviceType)
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

  const serviceCapacity = getServiceCapacity(serviceType);

  if (overlappingReservations.length >= serviceCapacity) {
    return {
      available: false,
      reason: `${getServiceName(serviceType)} ocupado en ese horario`,
      occupiedSpaces: overlappingReservations.length,
      capacity: serviceCapacity,
      alternatives: await suggestAlternatives(date, durationHours, serviceType)
    };
  }

  // Validar límite global de espacios si aplica
  if (CALENDAR_CONFIG.maxSimultaneousSpaces) {
    const dayReservations = await reservationRepository.findByDate(date);
    const overlappingAll = dayReservations.filter(res => {
      if (res.status === 'cancelled') return false;
      
      const resStart = timeToMinutes(res.start_time);
      const resEnd = timeToMinutes(res.end_time);
      
      return !(endMinutes <= resStart || startMinutes >= resEnd);
    });

    if (overlappingAll.length >= CALENDAR_CONFIG.maxSimultaneousSpaces) {
      return {
        available: false,
        reason: `Máximo ${CALENDAR_CONFIG.maxSimultaneousSpaces} espacios ocupados en ese horario`,
        occupiedSpaces: overlappingAll.length,
        capacity: CALENDAR_CONFIG.maxSimultaneousSpaces,
        alternatives: await suggestAlternatives(date, durationHours, serviceType)
      };
    }
  }
  
  return {
    available: true,
    occupiedSpaces: overlappingReservations.length,
    availableSpaces: Math.max(serviceCapacity - overlappingReservations.length, 0),
    capacity: serviceCapacity
  };
}

/**
 * 💡 Sugiere horarios alternativos si no hay disponibilidad
 */
async function suggestAlternatives(date, durationHours, serviceType = 'hotDesk') {
  const alternatives = [];
  const capacity = getServiceCapacity(serviceType);
  const dayReservations = await reservationRepository.findByDate(date, serviceType);

  // Buscar horarios libres el mismo día (evitar recursión infinita)
  for (let hour = CALENDAR_CONFIG.workingHours.start; hour <= CALENDAR_CONFIG.workingHours.end - durationHours; hour++) {
    const testTime = `${hour.toString().padStart(2, '0')}:00`;
    const startMinutes = timeToMinutes(testTime);
    const endMinutes = startMinutes + (durationHours * 60);
    
    const overlapping = dayReservations.filter(res => {
      if (res.status === 'cancelled') return false;
      const resStart = timeToMinutes(res.start_time);
      const resEnd = timeToMinutes(res.end_time);
      return !(endMinutes <= resStart || startMinutes >= resEnd);
    });
    
    if (overlapping.length < capacity && alternatives.length < 3) {
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
    const nextReservations = await reservationRepository.findByDate(nextDate, serviceType);
    const nextStart = timeToMinutes(testTime);
    const nextEnd = nextStart + (durationHours * 60);
    const overlappingNext = nextReservations.filter(res => {
      if (res.status === 'cancelled') return false;
      const resStart = timeToMinutes(res.start_time);
      const resEnd = timeToMinutes(res.end_time);
      return !(nextEnd <= resStart || nextStart >= resEnd);
    });
    
    if (overlappingNext.length < capacity) {
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
    guestCount = 0
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
      service_type: serviceType,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationHours,
      guest_count: guestCount,
      total_price: total,
      was_free: wasFree,
      status: 'pending',
      payment_status: wasFree ? 'waived' : 'pending',
      payment_data: email ? { email } : null
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
    const fallbackAlternatives = await suggestAlternatives(date, durationHours);
    return {
      success: false,
      error: error?.code === 'SQLITE_CONSTRAINT'
        ? 'Ese horario acaba de ocuparse hace segundos. Intentemos con otro horario.'
        : 'Error guardando la reserva',
      alternatives: fallbackAlternatives
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
 * 💳 Actualiza información de pago de una reserva
 */
export async function updateReservationPayment(reservationId, paymentInfo) {
  try {
    const reservation = await reservationRepository.findById(reservationId);
    
    if (!reservation) {
      throw new Error(`Reserva ${reservationId} no encontrada`);
    }
    
    const updated = await reservationRepository.markAsPaid(reservationId, {
      payment_method: paymentInfo.paymentMethod || 'transfer',
      payment_reference: paymentInfo.reference || null,
      payment_amount: paymentInfo.amount || reservation.total_amount,
      payment_date: paymentInfo.date || new Date().toISOString()
    });
    
    return updated;
  } catch (error) {
    console.error('[CALENDARIO] Error actualizando pago:', error);
    throw error;
  }
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

export { CALENDAR_CONFIG, SERVICE_CAPACITY };

export default {
  checkAvailability,
  createReservation,
  confirmReservation,
  cancelReservation,
  getUserReservations,
  updateReservationPayment,
  getReservationByPaymentInfo,
  getDayStats,
  CALENDAR_CONFIG,
  SERVICE_CAPACITY
};
