/**
 * 🎯 Helper para integrar sistema de confirmaciones con Aurora
 * Permite que Aurora active confirmaciones SI/NO desde sus respuestas
 */

import { generateConfirmationMessage } from './confirmation-flow.js';
import { savePendingConfirmation } from '../perfiles-interacciones/memoria.js';
import { checkAvailability } from './calendario.js';

/**
 * ✅ Detecta si Aurora quiere activar un flujo de confirmación
 */
export function shouldActivateConfirmation(message) {
  // Patrones que indican que Aurora quiere activar confirmación
  const confirmationTriggers = [
    /confirmas?\s+(esta\s+)?reserva/i,
    /\?\s*responde\s+(si|sí)/i,
    /continuar\s+con\s+el\s+pago/i,
    /acepta[rs]?\s+(esta\s+)?reserva/i,
    /\[CONFIRMAR\]/i,
    /sistema\s+confirmacion/i,
    /responde\s+(si|sí)\s+para\s+continuar/i
  ];

  return confirmationTriggers.some(pattern => pattern.test(message));
}

/**
 * 🎯 Extrae datos de reserva de la respuesta de Aurora
 */
export function extractReservationData(message, userProfile) {
  try {
    // Buscar patrones de fecha y hora en la respuesta
    const dateMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|mañana|hoy|lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i);
    const timeMatch = message.match(/(\d{1,2}:\d{2})/g);
    const priceMatch = message.match(/\$(\d+\.?\d*)/);
    const durationMatch = message.match(/(\d+)\s*hora[s]?/i);

    // Valores por defecto si no se detectan
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 🔧 FIX: Mejorar lógica de horarios
    let startTime = '09:00';
    let endTime = '11:00';
    let durationHours = 2;
    
    if (timeMatch && timeMatch.length >= 1) {
      startTime = timeMatch[0];
      
      if (timeMatch.length >= 2) {
        // Si hay dos horarios, usar ambos
        endTime = timeMatch[1];
        const start = parseInt(startTime.split(':')[0]);
        const end = parseInt(endTime.split(':')[0]);
        durationHours = end - start;
      } else {
        // Si solo hay un horario, es la hora de INICIO - calcular duración
        if (durationMatch) {
          durationHours = parseInt(durationMatch[1]);
        } else {
          // Duración por defecto de 2 horas
          durationHours = 2;
        }
        
        // Calcular hora de fin
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinutes = parseInt(startTime.split(':')[1]);
        const endHour = startHour + durationHours;
        endTime = `${endHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
      }
    }

    return {
      date: dateMatch ? parseDate(dateMatch[1]) : tomorrow.toISOString().split('T')[0],
      startTime,
      endTime,
      durationHours,
      serviceType: 'hotDesk',
      totalPrice: priceMatch ? parseFloat(priceMatch[1]) : 8.40,
      wasFree: !userProfile.freeTrialUsed,
      userId: userProfile.userId,
      userName: userProfile.name || 'Cliente'
    };
  } catch (error) {
    console.error('[Confirmation Helper] Error extrayendo datos:', error);
    return null;
  }
}

/**
 * 📅 Parsea fecha en diferentes formatos
 */
function parseDate(dateStr) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Manejar términos relativos
  if (/mañana/i.test(dateStr)) {
    return tomorrow.toISOString().split('T')[0];
  }
  
  if (/hoy/i.test(dateStr)) {
    return today.toISOString().split('T')[0];
  }

  // Manejar días de la semana (simplificado - próximo día)
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayMatch = dayNames.findIndex(day => 
    dateStr.toLowerCase().includes(day)
  );
  
  if (dayMatch !== -1) {
    const targetDay = new Date(today);
    const daysAhead = (dayMatch - today.getDay() + 7) % 7;
    targetDay.setDate(today.getDate() + (daysAhead === 0 ? 7 : daysAhead));
    return targetDay.toISOString().split('T')[0];
  }

  // Manejar formatos DD/MM/YYYY, DD-MM-YYYY
  const dateFormats = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
  ];

  for (const format of dateFormats) {
    const match = dateStr.match(format);
    if (match) {
      let [_, part1, part2, part3] = match;
      
      // Asumir formato DD/MM/YYYY para Ecuador
      const day = parseInt(part1);
      const month = parseInt(part2) - 1; // JavaScript months are 0-based
      let year = parseInt(part3);
      
      if (year < 100) year += 2000; // Convert 2-digit year
      
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
  }

  // Fallback a mañana
  return tomorrow.toISOString().split('T')[0];
}

/**
 * 🎯 Procesa y activa confirmación desde respuesta de Aurora
 */
export async function processAuroraConfirmationRequest(originalMessage, userProfile) {
  try {
    // 1. Extraer datos de la reserva del mensaje de Aurora
    const reservationData = extractReservationData(originalMessage, userProfile);
    
    if (!reservationData) {
      return {
        success: false,
        error: 'No se pudieron extraer datos de reserva del mensaje'
      };
    }

    // 2. Verificar disponibilidad
    const availability = await checkAvailability(
      reservationData.date,
      reservationData.startTime,
      reservationData.durationHours,
      reservationData.serviceType
    );

    if (!availability.available) {
      return {
        success: false,
        error: `No disponible: ${availability.reason}`,
        alternatives: availability.alternatives
      };
    }

    // 3. Guardar confirmación pendiente
    await savePendingConfirmation(userProfile.userId, reservationData);

    // 4. Generar mensaje de confirmación
    const confirmationMessage = generateConfirmationMessage(reservationData, userProfile);

    return {
      success: true,
      confirmationMessage,
      reservationData,
      replaceOriginalMessage: true
    };

  } catch (error) {
    console.error('[Confirmation Helper] Error procesando solicitud:', error);
    return {
      success: false,
      error: 'Error interno procesando confirmación'
    };
  }
}

/**
 * 🧠 Modifica respuesta de Aurora para incluir confirmación si es necesario
 */
export async function enhanceAuroraResponse(originalResponse, userProfile) {
  try {
    // Solo procesar si Aurora sugiere una confirmación
    if (!shouldActivateConfirmation(originalResponse)) {
      return {
        enhanced: false,
        finalMessage: originalResponse
      };
    }

    console.log('[Confirmation Helper] Aurora quiere activar confirmación, procesando...');

    const confirmationResult = await processAuroraConfirmationRequest(originalResponse, userProfile);

    if (!confirmationResult.success) {
      console.log('[Confirmation Helper] Error:', confirmationResult.error);
      return {
        enhanced: false,
        finalMessage: originalResponse,
        error: confirmationResult.error
      };
    }

    return {
      enhanced: true,
      finalMessage: confirmationResult.confirmationMessage,
      reservationData: confirmationResult.reservationData,
      originalMessage: originalResponse
    };

  } catch (error) {
    console.error('[Confirmation Helper] Error enhancing response:', error);
    return {
      enhanced: false,
      finalMessage: originalResponse,
      error: error.message
    };
  }
}

export default {
  shouldActivateConfirmation,
  extractReservationData,
  processAuroraConfirmationRequest,
  enhanceAuroraResponse
};