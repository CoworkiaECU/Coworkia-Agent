// Sistema de Calendario para Coworkia
// Maneja disponibilidad, reservas y límites de espacios

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'calendar_reservations.json');

// Asegurar que existe la carpeta data/
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
 * 📅 Carga todas las reservas del archivo
 */
async function loadReservations() {
  try {
    if (!fs.existsSync(RESERVATIONS_FILE)) {
      return [];
    }
    
    const data = await fs.promises.readFile(RESERVATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[CALENDARIO] Error cargando reservas:', error);
    return [];
  }
}

/**
 * 💾 Guarda todas las reservas al archivo
 */
async function saveReservations(reservations) {
  try {
    await fs.promises.writeFile(RESERVATIONS_FILE, JSON.stringify(reservations, null, 2));
    return true;
  } catch (error) {
    console.error('[CALENDARIO] Error guardando reservas:', error);
    return false;
  }
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
  const reservations = await loadReservations();
  
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
    if (res.date !== date || res.status === 'cancelled') return false;
    
    const resStart = timeToMinutes(res.startTime);
    const resEnd = timeToMinutes(res.endTime);
    
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
  const reservations = await loadReservations();
  const alternatives = [];
  
  // Buscar horarios libres el mismo día
  for (let hour = CALENDAR_CONFIG.workingHours.start; hour <= CALENDAR_CONFIG.workingHours.end - durationHours; hour++) {
    const testTime = `${hour.toString().padStart(2, '0')}:00`;
    const availability = await checkAvailability(date, testTime, durationHours);
    
    if (availability.available && alternatives.length < 3) {
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
    const testTime = '09:00'; // Hora popular
    const availability = await checkAvailability(nextDate, testTime, durationHours);
    
    if (availability.available) {
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
    email = null
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
  
  const reservations = await loadReservations();
  const endTime = minutesToTime(timeToMinutes(startTime) + (durationHours * 60));
  
  const newReservation = {
    id: `res_${Date.now()}_${userId}`,
    userId,
    userName,
    date,
    startTime,
    endTime,
    durationHours,
    serviceType,
    status: 'pending', // pending, confirmed, completed, cancelled
    wasFree,
    email,
    createdAt: new Date().toISOString(),
    confirmedAt: null
  };
  
  reservations.push(newReservation);
  
  const saved = await saveReservations(reservations);
  if (!saved) {
    return {
      success: false,
      error: 'Error guardando la reserva'
    };
  }
  
  return {
    success: true,
    reservation: newReservation,
    message: `Reserva creada: ${date} de ${startTime} a ${endTime} (${durationHours}h)`
  };
}

/**
 * ✅ Confirma una reserva existente
 */
export async function confirmReservation(reservationId) {
  const reservations = await loadReservations();
  const reservation = reservations.find(r => r.id === reservationId);
  
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
  
  reservation.status = 'confirmed';
  reservation.confirmedAt = new Date().toISOString();
  
  const saved = await saveReservations(reservations);
  if (!saved) {
    return {
      success: false,
      error: 'Error confirmando la reserva'
    };
  }
  
  return {
    success: true,
    message: 'Reserva confirmada exitosamente',
    reservation
  };
}

/**
 * ❌ Cancela una reserva
 */
export async function cancelReservation(reservationId, reason = 'Cancelada por usuario') {
  const reservations = await loadReservations();
  const reservation = reservations.find(r => r.id === reservationId);
  
  if (!reservation) {
    return {
      success: false,
      error: 'Reserva no encontrada'
    };
  }
  
  reservation.status = 'cancelled';
  reservation.cancelledAt = new Date().toISOString();
  reservation.cancelReason = reason;
  
  const saved = await saveReservations(reservations);
  if (!saved) {
    return {
      success: false,
      error: 'Error cancelando la reserva'
    };
  }
  
  return {
    success: true,
    message: 'Reserva cancelada',
    reservation
  };
}

/**
 * 📋 Obtiene reservas de un usuario específico
 */
export async function getUserReservations(userId) {
  const reservations = await loadReservations();
  return reservations.filter(r => r.userId === userId);
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
  const reservations = await loadReservations();
  
  // Buscar por monto y usuario
  const matches = reservations.filter(r => {
    if (r.status === 'cancelled') return false;
    
    const amountMatch = Math.abs(parseFloat(r.total) - parseFloat(paymentData.amount)) < 0.50;
    const dateMatch = r.createdAt && paymentData.date && 
                     Math.abs(new Date(r.createdAt) - new Date(paymentData.date)) < 24 * 60 * 60 * 1000; // 24 horas
    
    return amountMatch && dateMatch;
  });
  
  return matches.length > 0 ? matches[0] : null;
}

/**
 * �📊 Obtiene estadísticas del día
 */
export async function getDayStats(date) {
  const reservations = await loadReservations();
  const dayReservations = reservations.filter(r => r.date === date && r.status !== 'cancelled');
  
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