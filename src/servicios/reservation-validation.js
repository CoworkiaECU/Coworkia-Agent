/**
 * ✅ Validaciones mejoradas para reservas
 * Asegura que las reservas cumplan con todas las reglas de negocio
 */

// Configuración de horarios de negocio
const BUSINESS_CONFIG = {
  // Horarios laborales (horario de Ecuador UTC-5)
  weekdayStart: '08:00',
  weekdayEnd: '20:00',
  weekendStart: '09:00',
  weekendEnd: '18:00',
  
  // Restricciones de duración
  minDurationHours: 1,
  maxDurationHours: 8,
  defaultDurationHours: 2,
  
  // Ventana de reserva
  minAdvanceHours: 2,    // Mínimo 2 horas de anticipación
  maxAdvanceDays: 30,    // Máximo 30 días adelante
  
  // Break de almuerzo
  lunchBreakStart: '12:30',
  lunchBreakEnd: '14:00'
};

/**
 * 🕐 Valida que el horario esté dentro del horario laboral
 */
export function validateBusinessHours(date, startTime, endTime) {
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  const businessStart = isWeekend ? BUSINESS_CONFIG.weekendStart : BUSINESS_CONFIG.weekdayStart;
  const businessEnd = isWeekend ? BUSINESS_CONFIG.weekendEnd : BUSINESS_CONFIG.weekdayEnd;
  
  // Convertir a minutos para comparación fácil
  const toMinutes = (time) => {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  };
  
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const businessStartMinutes = toMinutes(businessStart);
  const businessEndMinutes = toMinutes(businessEnd);
  
  if (startMinutes < businessStartMinutes || endMinutes > businessEndMinutes) {
    return {
      valid: false,
      reason: isWeekend 
        ? `Fuera del horario laboral de fin de semana (${businessStart} - ${businessEnd})`
        : `Fuera del horario laboral (${businessStart} - ${businessEnd})`,
      suggestion: `Horario disponible: ${businessStart} - ${businessEnd}`
    };
  }
  
  return { valid: true };
}

/**
 * ⏰ Valida la duración de la reserva
 */
export function validateDuration(durationHours) {
  if (durationHours < BUSINESS_CONFIG.minDurationHours) {
    return {
      valid: false,
      reason: `Duración mínima: ${BUSINESS_CONFIG.minDurationHours} hora${BUSINESS_CONFIG.minDurationHours > 1 ? 's' : ''}`,
      suggestion: `Las reservas deben ser de al menos ${BUSINESS_CONFIG.minDurationHours} hora${BUSINESS_CONFIG.minDurationHours > 1 ? 's' : ''}`
    };
  }
  
  if (durationHours > BUSINESS_CONFIG.maxDurationHours) {
    return {
      valid: false,
      reason: `Duración máxima: ${BUSINESS_CONFIG.maxDurationHours} horas`,
      suggestion: `Para reservas de más de ${BUSINESS_CONFIG.maxDurationHours} horas, contacta a secretaria@coworkia.com`
    };
  }
  
  return { valid: true };
}

/**
 * 📅 Valida la ventana de tiempo permitida para reservar
 */
export function validateReservationWindow(date, time) {
  const now = new Date();
  
  // Convertir a timezone de Ecuador (UTC-5)
  const ecuadorOffset = -5 * 60; // minutos
  const ecuadorNow = new Date(now.getTime() + (ecuadorOffset + now.getTimezoneOffset()) * 60 * 1000);
  
  const reservationDateTime = new Date(`${date}T${time}:00`);
  const hoursUntilReservation = (reservationDateTime - ecuadorNow) / (1000 * 60 * 60);
  const daysUntilReservation = (reservationDateTime - ecuadorNow) / (1000 * 60 * 60 * 24);
  
  // Validar mínimo de anticipación
  if (hoursUntilReservation < BUSINESS_CONFIG.minAdvanceHours) {
    return {
      valid: false,
      reason: `Se requiere mínimo ${BUSINESS_CONFIG.minAdvanceHours} horas de anticipación`,
      suggestion: `La reserva más próxima disponible es en ${BUSINESS_CONFIG.minAdvanceHours} horas`,
      adjustedTime: getNextAvailableTime(ecuadorNow, BUSINESS_CONFIG.minAdvanceHours)
    };
  }
  
  // Validar máximo de anticipación
  if (daysUntilReservation > BUSINESS_CONFIG.maxAdvanceDays) {
    return {
      valid: false,
      reason: `Las reservas se pueden hacer con máximo ${BUSINESS_CONFIG.maxAdvanceDays} días de anticipación`,
      suggestion: `Intenta reservar para una fecha dentro de los próximos ${BUSINESS_CONFIG.maxAdvanceDays} días`
    };
  }
  
  return { valid: true };
}

/**
 * 🍴 Valida si interfiere con el break de almuerzo
 */
export function validateLunchBreak(startTime, endTime) {
  const toMinutes = (time) => {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  };
  
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const lunchStart = toMinutes(BUSINESS_CONFIG.lunchBreakStart);
  const lunchEnd = toMinutes(BUSINESS_CONFIG.lunchBreakEnd);
  
  // Verificar si la reserva interfiere con el almuerzo
  const overlapsLunch = (startMinutes < lunchEnd && endMinutes > lunchStart);
  
  if (overlapsLunch) {
    return {
      valid: false,
      reason: `La reserva interfiere con el horario de almuerzo (${BUSINESS_CONFIG.lunchBreakStart} - ${BUSINESS_CONFIG.lunchBreakEnd})`,
      suggestion: `Considera reservar antes de ${BUSINESS_CONFIG.lunchBreakStart} o después de ${BUSINESS_CONFIG.lunchBreakEnd}`,
      warning: true // Es warning, no error crítico
    };
  }
  
  return { valid: true };
}

/**
 * 🔍 Validación completa de una reserva
 */
export function validateReservation(date, startTime, endTime, durationHours) {
  const errors = [];
  const warnings = [];
  
  // 1. Validar duración
  const durationValidation = validateDuration(durationHours);
  if (!durationValidation.valid) {
    errors.push(durationValidation);
  }
  
  // 2. Validar horario laboral
  const businessHoursValidation = validateBusinessHours(date, startTime, endTime);
  if (!businessHoursValidation.valid) {
    errors.push(businessHoursValidation);
  }
  
  // 3. Validar ventana de reserva
  const windowValidation = validateReservationWindow(date, startTime);
  if (!windowValidation.valid) {
    errors.push(windowValidation);
  }
  
  // 4. Validar break de almuerzo (solo warning)
  const lunchValidation = validateLunchBreak(startTime, endTime);
  if (!lunchValidation.valid && lunchValidation.warning) {
    warnings.push(lunchValidation);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

/**
 * 🔄 Sugiere horarios alternativos si hay conflictos
 */
export function suggestAlternativeSlots(date, requestedStart, durationHours, existingReservations = []) {
  const alternatives = [];
  const businessStart = '08:00';
  const businessEnd = '20:00';
  
  // Generar slots de 30 minutos durante todo el día
  const slots = [];
  let currentTime = businessStart;
  
  while (currentTime < businessEnd) {
    const [hours, mins] = currentTime.split(':').map(Number);
    const endHours = hours + durationHours;
    const endTime = `${endHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    
    if (endTime <= businessEnd) {
      // Verificar si hay conflicto con reservas existentes
      const hasConflict = existingReservations.some(res => {
        return res.date === date && 
               res.startTime < endTime && 
               res.endTime > currentTime &&
               res.status === 'confirmed';
      });
      
      if (!hasConflict) {
        const validation = validateReservation(date, currentTime, endTime, durationHours);
        if (validation.valid) {
          alternatives.push({
            startTime: currentTime,
            endTime,
            durationHours,
            recommended: alternatives.length < 3 // Marcar las primeras 3 como recomendadas
          });
        }
      }
    }
    
    // Avanzar 30 minutos
    const totalMinutes = hours * 60 + mins + 30;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    currentTime = `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }
  
  return alternatives.slice(0, 5); // Máximo 5 alternativas
}

/**
 * ⏭️ Calcula el próximo horario disponible
 */
function getNextAvailableTime(fromDate, hoursAhead) {
  const next = new Date(fromDate.getTime() + hoursAhead * 60 * 60 * 1000);
  const hours = next.getHours();
  const mins = next.getMinutes();
  
  // Redondear al siguiente slot de 30 minutos
  const roundedMins = mins < 30 ? 30 : 0;
  const roundedHours = mins >= 30 ? hours + 1 : hours;
  
  const date = next.toISOString().split('T')[0];
  const time = `${roundedHours.toString().padStart(2, '0')}:${roundedMins.toString().padStart(2, '0')}`;
  
  return { date, time };
}

/**
 * 📊 Genera mensaje amigable con los errores de validación
 */
export function formatValidationErrors(validation) {
  if (validation.valid && !validation.hasWarnings) {
    return null;
  }
  
  let message = '';
  
  if (!validation.valid) {
    message += '❌ *No se puede completar la reserva:*\n\n';
    validation.errors.forEach((error, index) => {
      message += `${index + 1}. ${error.reason}\n`;
      if (error.suggestion) {
        message += `   💡 ${error.suggestion}\n`;
      }
      message += '\n';
    });
  }
  
  if (validation.hasWarnings) {
    message += '⚠️ *Advertencia:*\n\n';
    validation.warnings.forEach((warning) => {
      message += `• ${warning.reason}\n`;
      if (warning.suggestion) {
        message += `  ${warning.suggestion}\n`;
      }
    });
  }
  
  return message.trim();
}

export const CONFIG = BUSINESS_CONFIG;
