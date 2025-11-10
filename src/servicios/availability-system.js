/**
 * 🏢 Sistema de Gestión de Disponibilidad - Coworkia
 * Controla límites de espacios y horarios para evitar sobrebooking
 */

// 📊 CONFIGURACIÓN DE CAPACIDAD
const CAPACITY_LIMITS = {
  HOT_DESK: 6,           // Máximo 6 Hot Desk simultáneos
  MEETING_ROOM: 1,       // 1 Sala de Reuniones
  PRIVATE_OFFICE: 2      // 2 Oficinas Privadas (futuro)
};

// 🕐 HORARIOS DE OPERACIÓN
const OPERATING_HOURS = {
  OPEN: 8,    // 8:00 AM
  CLOSE: 18,  // 6:00 PM
  DAYS: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] // No domingo
};

/**
 * 📅 Obtener reservas existentes para una fecha específica
 */
async function getExistingReservations(date, serviceType = null) {
  try {
    // En el futuro, esto consultará una base de datos
    // Por ahora, simularemos con un sistema básico
    
    console.log(`[AVAILABILITY] 🔍 Consultando reservas para ${date}`);
    
    // Cargar todas las reservas del día (simular base de datos)
    const reservations = await loadDayReservations(date);
    
    if (serviceType) {
      return reservations.filter(r => r.serviceType === serviceType);
    }
    
    return reservations;
  } catch (error) {
    console.error('[AVAILABILITY] ❌ Error consultando reservas:', error);
    return [];
  }
}

/**
 * 🔍 Verificar disponibilidad para un horario específico
 */
export async function checkAvailability(reservationRequest) {
  const { date, startTime, endTime, serviceType, guestCount = 0 } = reservationRequest;
  
  console.log(`[AVAILABILITY] 🔍 Verificando disponibilidad:`, {
    fecha: date,
    horario: `${startTime} - ${endTime}`,
    servicio: serviceType,
    personas: 1 + guestCount
  });

  try {
    // 1. Verificar horario de operación
    const availability = await checkOperatingHours(startTime, endTime, date);
    if (!availability.isOpen) {
      return {
        available: false,
        reason: availability.reason,
        suggestions: availability.suggestions
      };
    }

    // 2. Obtener reservas existentes para el mismo tipo de servicio
    const existingReservations = await getExistingReservations(date, serviceType);
    
    // 3. Calcular overlap de horarios
    const conflictingReservations = findTimeConflicts(
      existingReservations, 
      startTime, 
      endTime
    );

    // 4. Verificar límites de capacidad
    const currentOccupancy = conflictingReservations.length;
    const maxCapacity = CAPACITY_LIMITS[serviceType.toUpperCase().replace(' ', '_')] || 1;
    
    console.log(`[AVAILABILITY] 📊 Ocupación actual: ${currentOccupancy}/${maxCapacity}`);
    
    if (currentOccupancy >= maxCapacity) {
      return {
        available: false,
        reason: `Capacidad máxima alcanzada para ${serviceType}`,
        currentOccupancy,
        maxCapacity,
        conflictingTimes: conflictingReservations.map(r => `${r.startTime}-${r.endTime}`),
        suggestions: generateAlternativeTimes(date, serviceType, startTime, endTime)
      };
    }

    // 5. Verificar espacio suficiente para acompañantes
    if (serviceType === 'Hot Desk' && guestCount > 2) {
      return {
        available: false,
        reason: 'Hot Desk tiene capacidad máxima para 3 personas (cliente + 2 acompañantes)',
        suggestions: ['Considera reservar una Sala de Reuniones para grupos grandes']
      };
    }

    // ✅ Disponible
    return {
      available: true,
      message: `✅ ${serviceType} disponible para ${1 + guestCount} persona${guestCount > 0 ? 's' : ''}`,
      occupancyInfo: {
        current: currentOccupancy,
        max: maxCapacity,
        remaining: maxCapacity - currentOccupancy
      }
    };

  } catch (error) {
    console.error('[AVAILABILITY] ❌ Error verificando disponibilidad:', error);
    return {
      available: false,
      reason: 'Error interno verificando disponibilidad',
      error: error.message
    };
  }
}

/**
 * 🕐 Verificar horarios de operación
 */
async function checkOperatingHours(startTime, endTime, date) {
  const dayOfWeek = new Date(date).toLocaleDateString('es-ES', { weekday: 'long' });
  
  // Verificar día de la semana
  if (!OPERATING_HOURS.DAYS.includes(dayOfWeek)) {
    return {
      isOpen: false,
      reason: `No abrimos los ${dayOfWeek}s`,
      suggestions: ['Elige un día de lunes a sábado']
    };
  }

  // Verificar horarios
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  
  if (startHour < OPERATING_HOURS.OPEN || endHour > OPERATING_HOURS.CLOSE) {
    return {
      isOpen: false,
      reason: `Horario de atención: ${OPERATING_HOURS.OPEN}:00 - ${OPERATING_HOURS.CLOSE}:00`,
      suggestions: [
        'Ajusta tu horario entre 8:00 AM y 6:00 PM',
        'Considera reservar para el día siguiente'
      ]
    };
  }

  return { isOpen: true };
}

/**
 * ⏰ Encontrar conflictos de horarios
 */
function findTimeConflicts(reservations, startTime, endTime) {
  return reservations.filter(reservation => {
    const resStart = timeToMinutes(reservation.startTime);
    const resEnd = timeToMinutes(reservation.endTime);
    const reqStart = timeToMinutes(startTime);
    const reqEnd = timeToMinutes(endTime);

    // Verificar overlap
    return (reqStart < resEnd && reqEnd > resStart);
  });
}

/**
 * 🔄 Generar horarios alternativos
 */
function generateAlternativeTimes(date, serviceType, requestedStart, requestedEnd) {
  const alternatives = [];
  const duration = timeToMinutes(requestedEnd) - timeToMinutes(requestedStart);
  
  // Sugerir horarios antes y después
  const startHour = parseInt(requestedStart.split(':')[0]);
  
  // Horario anterior
  if (startHour > OPERATING_HOURS.OPEN) {
    const newStart = `${startHour - 2}:00`;
    const newEnd = minutesToTime(timeToMinutes(newStart) + duration);
    alternatives.push(`${newStart} - ${newEnd}`);
  }
  
  // Horario posterior
  if (startHour < OPERATING_HOURS.CLOSE - 2) {
    const newStart = `${startHour + 2}:00`;
    const newEnd = minutesToTime(timeToMinutes(newStart) + duration);
    alternatives.push(`${newStart} - ${newEnd}`);
  }
  
  return alternatives;
}

/**
 * 🔧 Utilidades de tiempo
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * 📂 Cargar reservas del día (placeholder para base de datos)
 */
async function loadDayReservations(date) {
  // Por ahora, simular con datos en memoria
  // En el futuro, esto consultará una base de datos real
  
  const mockReservations = [
    // Ejemplo: algunos Hot Desk ocupados
    { serviceType: 'Hot Desk', startTime: '09:00', endTime: '11:00', user: 'Usuario1' },
    { serviceType: 'Hot Desk', startTime: '14:00', endTime: '16:00', user: 'Usuario2' },
    // Ejemplo: Sala de reuniones ocupada
    { serviceType: 'Sala de Reuniones', startTime: '10:00', endTime: '12:00', user: 'Empresa X' }
  ];
  
  return mockReservations;
}

/**
 * 📊 Obtener estadísticas de ocupación
 */
export async function getOccupancyStats(date) {
  const reservations = await getExistingReservations(date);
  
  const stats = {
    date,
    hotDesk: {
      occupied: reservations.filter(r => r.serviceType === 'Hot Desk').length,
      capacity: CAPACITY_LIMITS.HOT_DESK,
      available: CAPACITY_LIMITS.HOT_DESK - reservations.filter(r => r.serviceType === 'Hot Desk').length
    },
    meetingRoom: {
      occupied: reservations.filter(r => r.serviceType === 'Sala de Reuniones').length,
      capacity: CAPACITY_LIMITS.MEETING_ROOM,
      available: CAPACITY_LIMITS.MEETING_ROOM - reservations.filter(r => r.serviceType === 'Sala de Reuniones').length
    },
    totalReservations: reservations.length
  };
  
  console.log('[AVAILABILITY] 📊 Estadísticas de ocupación:', stats);
  return stats;
}

export {
  CAPACITY_LIMITS,
  OPERATING_HOURS,
  getExistingReservations
};