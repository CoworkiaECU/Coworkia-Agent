/**
 * 🎯 Helper para integrar sistema de confirmaciones con Aurora
 * Permite que Aurora active confirmaciones SI/NO desde sus respuestas
 */

import confirmationFlowService, { generateConfirmationMessage } from './confirmation-flow.js';
import databaseService from '../database/database.js';
import calendario, { checkAvailability } from './calendario.js';
import { 
  validateReservation, 
  suggestAlternativeSlots, 
  formatValidationErrors 
} from './reservation-validation.js';
import { savePendingConfirmation } from '../perfiles-interacciones/memoria-sqlite.js';
import reservationRepository from '../database/reservationRepository.js';

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
    // 🎯 DETECTAR TIPO DE SERVICIO DESDE EL MENSAJE
    let serviceType = 'hotDesk'; // Por defecto Hot Desk
    const guestCount = extractGuestCount(message);
    
    // Detectar sala de reunión
    const meetingRoomPatterns = [
      /sala\s+de\s+reun(ión|ion)/i,
      /meeting\s+room/i,
      /sala\s+reun(ión|ion)/i,
      /espacio\s+para\s+reun(ión|ion)/i,
      /sala\s+privada/i,
      /reunirse/i
    ];
    
    if (meetingRoomPatterns.some(pattern => pattern.test(message))) {
      serviceType = 'meetingRoom';
      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG] 🏢 DETECTADO: Sala de Reunión solicitada');
      }
    }

    // 🎯 MEJORADO: Buscar patrones de fecha con más flexibilidad
    console.log('[AURORA-EXTRACT] 📝 Analizando mensaje:', message.substring(0, 200) + '...');
    
    // Detectar fechas: números, "hoy", "mañana", días de semana
    const dateMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|mañana|ma\u00f1ana|hoy|hoi|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/i);
    console.log('[AURORA-EXTRACT] 📅 dateMatch:', dateMatch ? dateMatch[1] : 'NO DETECTADO');
    
    // 🎯 MEJORADO: Detectar horarios con múltiples formatos naturales
    // Patrones: "10am", "10 am", "10:00", "10:30am", "3pm", "15:00", "6pm"
    // PRIORIDAD: Primero buscar con am/pm (más específico), luego formato 24h
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/gi) ||  // "6pm", "10:30am"
                     message.match(/(\d{1,2}:\d{2})/g) ||                        // "14:30", "9:00"
                     message.match(/(\d{1,2})\s+(am|pm|AM|PM)/gi);               // "6 pm" con espacio
    console.log('[AURORA-EXTRACT] 🕐 timeMatch:', timeMatch ? timeMatch : 'NO DETECTADO');
    
    const priceMatch = message.match(/\$(\d+\.?\d*)/);
    const durationMatch = message.match(/(\d+)\s*hora[s]?/i);
    console.log('[AURORA-EXTRACT] ⏱️ durationMatch:', durationMatch ? durationMatch[1] + 'h' : 'NO DETECTADO');
    
    // 🚨 VALIDACIÓN TEMPRANA: Si no hay hora, abortar con mensaje útil
    if (!timeMatch || timeMatch.length === 0) {
      console.error('[AURORA-EXTRACT] ❌ NO SE DETECTÓ HORARIO en el mensaje');
      console.error('[AURORA-EXTRACT] 💡 Mensaje recibido:', message);
      return null; // Esto hará que Aurora pida aclaración
    }

    // Valores por defecto si no se detectan
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 🔧 FIX: Mejorar lógica de horarios - normalizar formato
    let startTime = '09:00';
    let endTime = '11:00';
    let durationHours = 2; // SIEMPRE 2 HORAS POR DEFECTO
    
    if (timeMatch && timeMatch.length >= 1) {
      // Normalizar primer horario detectado (SIEMPRE ES LA HORA DE INICIO)
      startTime = normalizeTimeFormat(timeMatch[0]);
      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG] 🕐 startTime normalizado:', startTime);
      }
      
      // 🎯 NUEVA LÓGICA: Solo mirar durationMatch, IGNORAR segundo horario
      if (durationMatch) {
        const requestedDuration = parseInt(durationMatch[1]);
        if (process.env.DEBUG === 'true') {
          console.log('[DEBUG] ⏱️ Duración solicitada explícitamente:', requestedDuration, 'horas');
        }
        
        // SOLO permitir más de 2h si el usuario lo dice EXPLÍCITAMENTE
        if (requestedDuration > 2 && requestedDuration <= 8) {
          durationHours = requestedDuration;
          if (process.env.DEBUG === 'true') {
            console.log('[DEBUG] ✅ Aceptando duración explícita:', durationHours, 'horas');
          }
        } else if (requestedDuration > 8) {
          durationHours = 2;
          if (process.env.DEBUG === 'true') {
            console.log('[DEBUG] ⚠️ Duración muy larga (>8h) - LIMITANDO A 2 HORAS');
          }
        } else {
          durationHours = requestedDuration;
        }
      } else {
        // Sin duración explícita = 2 horas por defecto
        durationHours = 2;
        if (process.env.DEBUG === 'true') {
          console.log('[DEBUG] 📋 Sin duración especificada - Usando 2 HORAS por defecto');
        }
      }
      
      // 🎯 CALCULAR endTime desde startTime + duración validada
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinutes = parseInt(startTime.split(':')[1] || '0');
      const endHour = startHour + durationHours;
      endTime = `${endHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
      
      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG] 📅 Horario final:', startTime, '-', endTime, `(${durationHours}h)`);
      }
    }

    const reservationDate = dateMatch ? parseDate(dateMatch[1]) : tomorrow.toISOString().split('T')[0];
    
    // 🚨 VALIDACIÓN: Usar zona horaria de Ecuador (America/Guayaquil) con Intl
    const now = new Date();
    const ecuadorFormatter = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const ecuadorParts = ecuadorFormatter.formatToParts(now);
    const ecuadorHour = parseInt(ecuadorParts.find(p => p.type === 'hour').value);
    const ecuadorMinute = parseInt(ecuadorParts.find(p => p.type === 'minute').value);
    const ecuadorDate = `${ecuadorParts.find(p => p.type === 'year').value}-${ecuadorParts.find(p => p.type === 'month').value}-${ecuadorParts.find(p => p.type === 'day').value}`;
    
    console.log('[VALIDATION] Hora Ecuador actual:', ecuadorHour, '- Fecha:', ecuadorDate);
    console.log('[VALIDATION] Horario solicitado:', startTime, 'fecha:', reservationDate);
    
    // Solo validar si es el mismo día
    if (reservationDate === ecuadorDate) {
      const [requestedHourRaw, requestedMinutesRaw = '0'] = startTime.split(':');
      const requestedHour = parseInt(requestedHourRaw, 10);
      const requestedMinutes = parseInt(requestedMinutesRaw, 10);

      const isPastHour = requestedHour < ecuadorHour;
      const isSameHourPastMinutes = requestedHour === ecuadorHour && requestedMinutes <= ecuadorMinute;

      if (isPastHour || isSameHourPastMinutes) {
        console.warn('[VALIDATION] Horario en el pasado detectado Ecuador:', startTime, 'actual Ecuador:', ecuadorHour);
        // Ajustar a próxima hora disponible en Ecuador
        const nextHour = ecuadorHour + 1;
        startTime = `${nextHour.toString().padStart(2, '0')}:00`;
        const endHour = nextHour + durationHours;
        endTime = `${endHour.toString().padStart(2, '0')}:00`;
        console.log('[VALIDATION] Horario ajustado Ecuador:', startTime, '-', endTime);
      } else {
        console.log('[VALIDATION] ✅ Horario válido para Ecuador');
      }
    }

    // 🔧 CÁLCULO AUTOMÁTICO DE PRECIOS SEGÚN SERVICIO
    const { totalPrice, wasFree } = calculateServicePrice(
      serviceType, 
      durationHours, 
      guestCount, 
      userProfile, 
      priceMatch
    );

    return {
      date: reservationDate,
      startTime,
      endTime,
      durationHours,
      serviceType, // 🎯 Ahora detecta correctamente hotDesk o meetingRoom
      totalPrice,
      wasFree,
      guestCount,
      userId: userProfile.userId,
      userName: userProfile.name || 'Cliente'
    };
  } catch (error) {
    console.error('[Confirmation Helper] Error extrayendo datos:', error);
    return null;
  }
}

/**
 * � Normaliza formato de hora (11 am → 11:00, 1:30pm → 13:30)
 */
function normalizeTimeFormat(timeStr) {
  if (!timeStr) return '09:00';
  
  // Limpiar y normalizar
  timeStr = timeStr.toLowerCase().trim();
  
  console.log('[NORMALIZE-TIME] 🕐 Input:', timeStr);
  
  // Si ya está en formato HH:MM, verificar y retornar
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const normalized = timeStr.padStart(5, '0');
    console.log('[NORMALIZE-TIME] ✅ Formato HH:MM detectado →', normalized);
    return normalized;
  }
  
  // Extraer componentes (mejorado para capturar am/pm sin espacio)
  const match = timeStr.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
  if (!match) {
    console.log('[NORMALIZE-TIME] ❌ No match, usando default 09:00');
    return '09:00';
  }
  
  let hour = parseInt(match[1]);
  let minutes = parseInt(match[2] || '0');
  const period = match[3];
  
  console.log('[NORMALIZE-TIME] 📊 Parsed: hour=', hour, 'minutes=', minutes, 'period=', period);
  
  // Convertir AM/PM a formato 24h
  if (period === 'pm' && hour !== 12) {
    hour += 12;
    console.log('[NORMALIZE-TIME] 🔄 Converted PM: hour=', hour);
  } else if (period === 'am' && hour === 12) {
    hour = 0;
    console.log('[NORMALIZE-TIME] 🔄 Converted 12AM: hour=', hour);
  }
  
  // Asegurar formato válido
  if (hour > 23) hour = 23;
  if (minutes > 59) minutes = 0;
  
  const result = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  console.log('[NORMALIZE-TIME] ✅ Result:', result);
  return result;
}

/**
 * 📅 Parsea fecha en diferentes formatos (timezone-aware para Ecuador)
 */
function parseDate(dateStr) {
  // Obtener fecha actual en timezone Ecuador
  // 🔧 FIX: Usar fecha local de Ecuador consistentemente
  const formatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const today = `${year}-${month}-${day}`;
  
  // 🔧 FIX: Calcular mañana usando Date object correctamente
  const todayDate = new Date(`${year}-${month}-${day}T12:00:00-05:00`); // Ecuador timezone
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  
  // Formatear mañana manteniendo timezone
  const tomorrowParts = formatter.formatToParts(tomorrowDate);
  const tomorrow = `${tomorrowParts.find(p => p.type === 'year').value}-${tomorrowParts.find(p => p.type === 'month').value}-${tomorrowParts.find(p => p.type === 'day').value}`;

  // Manejar términos relativos
  if (/mañana/i.test(dateStr)) {
    console.log(`[PARSE-DATE] 🗓️ "mañana" detectado → ${tomorrow}`);
    return tomorrow;
  }
  
  if (/hoy/i.test(dateStr)) {
    console.log(`[PARSE-DATE] 🗓️ "hoy" detectado → ${today}`);
    return today;
  }

  // 🔧 FIX: Manejar días de la semana correctamente
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayMatch = dayNames.findIndex(day => 
    dateStr.toLowerCase().includes(day)
  );
  
  if (dayMatch !== -1) {
    const currentDayIndex = todayDate.getDay();
    const daysAhead = (dayMatch - currentDayIndex + 7) % 7;
    const targetDay = new Date(todayDate);
    targetDay.setDate(targetDay.getDate() + (daysAhead === 0 ? 7 : daysAhead));
    
    const targetParts = formatter.formatToParts(targetDay);
    const targetDateStr = `${targetParts.find(p => p.type === 'year').value}-${targetParts.find(p => p.type === 'month').value}-${targetParts.find(p => p.type === 'day').value}`;
    console.log(`[PARSE-DATE] 🗓️ Día "${dayNames[dayMatch]}" detectado → ${targetDateStr}`);
    return targetDateStr;
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
      
      // 🔧 FIX: Crear fecha en timezone de Ecuador
      const date = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00-05:00`);
      const dateParts = formatter.formatToParts(date);
      const dateStr = `${dateParts.find(p => p.type === 'year').value}-${dateParts.find(p => p.type === 'month').value}-${dateParts.find(p => p.type === 'day').value}`;
      console.log(`[PARSE-DATE] 🗓️ Fecha manual "${part1}/${part2}/${part3}" → ${dateStr}`);
      return dateStr;
    }
  }

  // 🔧 FIX: Fallback a mañana usando variable ya calculada
  console.log(`[PARSE-DATE] ⚠️ Fecha no reconocida "${dateStr}", fallback → mañana ${tomorrow}`);
  return tomorrow;
}

/**
 * 🎯 Procesa y activa confirmación desde respuesta de Aurora
 */
export async function processAuroraConfirmationRequest(originalMessage, userProfile, formResult = null) {
  try {
    console.log('[AURORA-PROCESS] 🎯 Iniciando procesamiento de confirmación');
    console.log('[AURORA-PROCESS] 👤 Usuario:', userProfile.userId);
    console.log('[AURORA-PROCESS] 📨 Mensaje:', originalMessage.substring(0, 150) + '...');
    console.log('[AURORA-PROCESS] 📋 FormResult disponible:', formResult ? 'SÍ' : 'NO');
    
    // 1. PRIORIDAD: Usar datos del formulario parcial si están disponibles
    let reservationData = null;
    
    if (formResult && formResult.form) {
      const form = formResult.form;
      console.log('[AURORA-PROCESS] 📝 Usando datos del formulario parcial:', {
        spaceType: form.spaceType,
        date: form.date,
        time: form.time,
        email: form.email
      });
      
      // Construir reservationData desde el formulario
      if (form.date && form.time && form.spaceType) {
        const [hour, minutes = '0'] = form.time.split(':');
        const endHour = parseInt(hour) + (form.durationHours || 2);
        
        reservationData = {
          date: form.date,
          startTime: form.time,
          endTime: `${endHour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`,
          durationHours: form.durationHours || 2,
          serviceType: form.spaceType === 'meetingRoom' ? 'meetingRoom' : 'hotDesk',
          email: form.email || userProfile.email,
          numPeople: form.numPeople || 1,
          totalPrice: 0, // Se calculará después
          wasFree: !userProfile.freeTrialUsed
        };
        
        console.log('[AURORA-PROCESS] ✅ Datos construidos desde formulario:', reservationData);
      }
    }
    
    // 2. Fallback: Intentar extraer del mensaje si no hay formulario
    if (!reservationData) {
      console.log('[AURORA-PROCESS] 📨 Intentando extraer datos del mensaje (fallback)...');
      reservationData = extractReservationData(originalMessage, userProfile);
    }
    
    if (!reservationData) {
      console.error('[AURORA-PROCESS] ❌ FALLO: No se pudieron obtener datos de reserva');
      console.error('[AURORA-PROCESS] 💡 Mensaje:', originalMessage.substring(0, 200));
      console.error('[AURORA-PROCESS] 💡 Formulario:', formResult ? 'disponible pero incompleto' : 'no disponible');
      
      // 🎯 RESPUESTA AMIGABLE: Explica qué falta
      return {
        success: false,
        error: 'parsing_failed',
        userMessage: `Lo siento, no logré entender la hora que mencionaste 🤔

Por favor, intenta así:
• "Quiero un hot desk para hoy a las 10am"
• "Necesito una sala para mañana a las 2pm"
• "Hot desk el lunes a las 9:00"

¿A qué hora te gustaría venir?`
      };
    }
    
    console.log('[AURORA-PROCESS] ✅ Datos extraídos:', {
      date: reservationData.date,
      startTime: reservationData.startTime,
      endTime: reservationData.endTime,
      duration: reservationData.durationHours,
      serviceType: reservationData.serviceType
    });

    // 1.5. 🕐 VALIDACIÓN PREVIA: Verificar que fecha/hora no estén en el pasado
    const now = new Date();
    const ecuadorFormatter = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const ecuadorParts = ecuadorFormatter.formatToParts(now);
    const currentEcuadorDate = `${ecuadorParts.find(p => p.type === 'year').value}-${ecuadorParts.find(p => p.type === 'month').value}-${ecuadorParts.find(p => p.type === 'day').value}`;
    const currentEcuadorHour = parseInt(ecuadorParts.find(p => p.type === 'hour').value);
    const currentEcuadorMinute = parseInt(ecuadorParts.find(p => p.type === 'minute').value);
    
    // Comparar fechas
    const requestedDate = new Date(reservationData.date + 'T00:00:00');
    const ecuadorCurrentDate = new Date(currentEcuadorDate + 'T00:00:00');
    
    // 🚫 VALIDAR DÍA DE LA SEMANA - Domingo cerrado
    const dayOfWeek = requestedDate.getDay(); // 0 = domingo, 6 = sábado
    
    if (dayOfWeek === 0) {
      console.warn('[AURORA-PROCESS] 🚫 Domingo detectado - Coworkia CERRADO');
      
      // Sugerir lunes siguiente
      const nextMonday = new Date(requestedDate);
      nextMonday.setDate(nextMonday.getDate() + 1); // Domingo + 1 = Lunes
      const nextMondayStr = nextMonday.toISOString().split('T')[0];
      
      return {
        success: false,
        error: 'closed_sunday',
        userMessage: `🚫 Los domingos Coworkia está cerrado, Diego 😊

Estamos abiertos:
📅 Lunes a viernes: 8:30 AM - 6:00 PM
📅 Sábado: 9:00 AM - 2:00 PM

¿Qué tal si reservas para el lunes ${nextMondayStr}? 🗓️`
      };
    }
    
    // 🎉 VALIDAR FERIADOS - Cerrado en días festivos
    const FERIADOS_ECUADOR = [
      '2025-01-01', '2025-02-10', '2025-02-11', '2025-03-28', '2025-05-01', 
      '2025-05-24', '2025-07-24', '2025-08-10', '2025-10-09', '2025-11-02', 
      '2025-11-03', '2025-12-25', '2025-12-31',
      '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-05-01',
      '2026-05-24', '2026-07-24', '2026-08-10', '2026-10-09', '2026-11-02',
      '2026-11-03', '2026-12-25', '2026-12-31'
    ];
    
    const NOMBRES_FERIADOS = {
      '01-01': 'Año Nuevo', '02-10': 'Carnaval', '02-11': 'Carnaval',
      '02-16': 'Carnaval', '02-17': 'Carnaval', '03-28': 'Viernes Santo',
      '04-03': 'Viernes Santo', '05-01': 'Día del Trabajo', 
      '05-24': 'Batalla de Pichincha', '07-24': 'Natalicio de Simón Bolívar',
      '08-10': 'Primer Grito de Independencia', '10-09': 'Independencia de Guayaquil',
      '11-02': 'Día de los Difuntos', '11-03': 'Independencia de Cuenca',
      '12-25': 'Navidad', '12-31': 'Fin de Año'
    };
    
    if (FERIADOS_ECUADOR.includes(reservationData.date)) {
      const monthDay = reservationData.date.substring(5);
      const nombreFeriado = NOMBRES_FERIADOS[monthDay] || 'Feriado';
      console.warn('[AURORA-PROCESS] 🎉 Feriado detectado:', nombreFeriado);
      
      // Buscar siguiente día hábil
      let nextWorkingDay = new Date(requestedDate);
      let daysToAdd = 1;
      
      while (daysToAdd < 7) {
        nextWorkingDay.setDate(nextWorkingDay.getDate() + 1);
        const nextDateStr = nextWorkingDay.toISOString().split('T')[0];
        const nextDayOfWeek = nextWorkingDay.getDay();
        
        // Si no es domingo ni feriado, es día hábil
        if (nextDayOfWeek !== 0 && !FERIADOS_ECUADOR.includes(nextDateStr)) {
          break;
        }
        daysToAdd++;
      }
      
      const nextWorkingDayStr = nextWorkingDay.toISOString().split('T')[0];
      
      return {
        success: false,
        error: 'closed_holiday',
        userMessage: `🎉 ${nombreFeriado} - Coworkia está cerrado, Diego 😊

Los feriados no atendemos, pero puedes reservar para el próximo día hábil.

¿Qué tal si reservas para el ${nextWorkingDayStr}? 📅`
      };
    }
    
    if (requestedDate < ecuadorCurrentDate) {
      // Fecha en el pasado
      console.warn('[AURORA-PROCESS] 📅 Fecha en el pasado:', reservationData.date, 'vs', currentEcuadorDate);
      return {
        success: false,
        error: 'past_date',
        userMessage: `⚠️ Esa fecha ya pasó en el calendario, Diego 😅

📅 La fecha que mencionaste es: ${reservationData.date}
🗓️ Hoy es: ${currentEcuadorDate}

Por favor, verifica la fecha de tu reserva e intenta nuevamente. ¿Para qué día quieres venir? 😊`
      };
    } else if (requestedDate.getTime() === ecuadorCurrentDate.getTime()) {
      // Mismo día - verificar hora
      const [reqHour, reqMin = '0'] = reservationData.startTime.split(':');
      const requestedHour = parseInt(reqHour);
      const requestedMinute = parseInt(reqMin);
      
      const isPast = requestedHour < currentEcuadorHour || 
                     (requestedHour === currentEcuadorHour && requestedMinute <= currentEcuadorMinute);
      
      if (isPast) {
        console.warn('[AURORA-PROCESS] ⏰ Hora en el pasado:', reservationData.startTime, 'vs', `${currentEcuadorHour}:${currentEcuadorMinute}`);
        
        // Sugerir próxima hora disponible
        const nextAvailableHour = currentEcuadorHour + 1;
        
        return {
          success: false,
          error: 'past_time',
          userMessage: `⏰ Esa hora ya pasó, Diego 😅

🕐 La hora que mencionaste: ${reservationData.startTime}
🕐 Hora actual en Ecuador: ${currentEcuadorHour.toString().padStart(2, '0')}:${currentEcuadorMinute.toString().padStart(2, '0')}

¿Qué tal si reservas para las ${nextAvailableHour.toString().padStart(2, '0')}:00 o más tarde? 😊`
        };
      }
    }

    // 2. ✅ VALIDACIONES MEJORADAS: Duración, horario laboral, ventana de reserva
    const validation = validateReservation(
      reservationData.date,
      reservationData.startTime,
      reservationData.endTime,
      reservationData.durationHours
    );
    
    if (!validation.valid) {
      console.error('[AURORA-PROCESS] ❌ VALIDACIÓN FALLIDA:', validation.errors);
      
      // Obtener reservas existentes del día para evitar conflictos
      let existingReservations = [];
      try {
        const allReservations = await reservationRepository.findByDate(reservationData.date);
        existingReservations = allReservations.filter(r => 
          r.status !== 'cancelled' && r.status !== 'rejected'
        );
        console.log('[AURORA-PROCESS] 📅 Reservas del día:', existingReservations.length);
      } catch (error) {
        console.error('[AURORA-PROCESS] ⚠️ Error obteniendo reservas:', error);
      }
      
      // Sugerir horarios alternativos considerando reservas reales
      const alternatives = suggestAlternativeSlots(
        reservationData.date,
        reservationData.startTime,
        reservationData.durationHours,
        existingReservations
      );
      
      console.log('[AURORA-PROCESS] 💡 Alternativas sugeridas:', alternatives.slice(0, 3));
      
      // 🎯 RESPUESTA AMIGABLE basada en el tipo de error
      let userMessage = '❌ ';
      
      // FIX: validation.errors contiene objetos {valid, reason, suggestion}, no strings
      if (validation.errors.some(err => err.reason?.includes('horario') || err.reason?.includes('Fuera del horario'))) {
        userMessage += `Ese horario no está disponible 😕

📅 ¿Qué tal alguna de estas opciones?
${alternatives.slice(0, 3).map((alt, i) => `${i+1}. ${alt.startTime} - ${alt.endTime}`).join('\n')}

¿Te sirve alguna?`;
      } else if (validation.errors.some(err => err.reason?.includes('duración') || err.reason?.includes('Duración'))) {
        userMessage += `La duración debe ser entre 1 y 8 horas 🕐

¿Cuántas horas necesitas?`;
      } else {
        userMessage += formatValidationErrors(validation);
      }
      
      return {
        success: false,
        error: 'validation_failed',
        userMessage,
        alternatives: alternatives.slice(0, 3).map(alt => 
          `${alt.startTime} - ${alt.endTime} (${alt.durationHours}h)`
        ),
        validationDetails: validation
      };
    }
    
    // Log warnings pero continuar
    if (validation.hasWarnings) {
      console.log('[Validation] ⚠️ Advertencias:', validation.warnings);
    }

    // 3. Verificar disponibilidad (pasando userId para ignorar reservas pending propias)
    const availability = await checkAvailability(
      reservationData.date,
      reservationData.startTime,
      reservationData.durationHours,
      reservationData.serviceType,
      null, // baseTime
      userProfile.userId // userId para ignorar sus propias reservas pending
    );

    if (!availability.available) {
      console.error('[AURORA-PROCESS] ❌ NO DISPONIBLE:', availability.reason);
      console.log('[AURORA-PROCESS] 💡 Alternativas de calendario:', availability.alternatives);
      
      // 🎯 RESPUESTA AMIGABLE con alternativas
      const altText = availability.alternatives && availability.alternatives.length > 0
        ? `\n\n📅 ¿Qué tal estos horarios?\n${availability.alternatives.slice(0, 3).map((alt, i) => 
            `${i+1}. ${alt.startTime || alt}`
          ).join('\n')}`
        : '\n\n¿Prefieres otro horario? 😊';
      
      return {
        success: false,
        error: 'availability_failed',
        userMessage: `⚠️ ${availability.reason}${altText}`,
        alternatives: availability.alternatives
      };
    }
    
    console.log('[AURORA-PROCESS] ✅ Disponibilidad confirmada');

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
    console.error('[Confirmation Helper] Stack trace:', error.stack);
    console.error('[Confirmation Helper] Error name:', error.name);
    console.error('[Confirmation Helper] Error message:', error.message);
    return {
      success: false,
      error: 'Error interno procesando confirmación',
      userMessage: `¡Ups! 😅 Tuve un problema técnico procesando tu reserva.\n\n¿Podrías intentar de nuevo o probar con otro horario? 🔄`
    };
  }
}

/**
 * 💰 Modifica respuesta de Aurora para usuarios recurrentes (ya no gratis)
 */
export function enhanceRecurrentUserResponse(originalResponse, userProfile) {
  // 🚨 CRÍTICO: NO mostrar precios si acaba de confirmar reserva
  if (userProfile.justConfirmed) {
    console.log('[Enhancement] Usuario acaba de confirmar, NO agregar precios');
    return originalResponse; // Confirmación reciente, no modificar
  }

  // Solo modificar si el usuario ya usó su día gratis
  if (!userProfile.freeTrialUsed) {
    return originalResponse; // Usuario nuevo, no modificar
  }

  // Detectar si Aurora está ofreciendo algo relacionado con reservas
  const reservationPatterns = [
    /reserva/i,
    /agendar/i,
    /espacio/i,
    /hot\s*desk/i,
    /sala.*reun/i,
    /cuando.*quieres.*venir/i,
    /disponibilidad/i,
    /horario/i
  ];

  const isReservationRelated = reservationPatterns.some(pattern => pattern.test(originalResponse));
  
  if (!isReservationRelated) {
    return originalResponse; // No es sobre reservas, no modificar
  }

  // Si ya menciona precios, no duplicar
  if (originalResponse.includes('$') || originalResponse.includes('precio') || originalResponse.includes('pagar')) {
    return originalResponse; // Ya menciona precios
  }

  // Agregar información de precios para usuario recurrente de forma SUTIL
  const pricingInfo = `\n\n💰 *Perfecto! Las tarifas para hoy son:*

🏢 *Hot Desk:* $10 (primeras 2 horas), luego $10 por hora adicional
🏢 *Sala Reuniones:* $29 por sala (3-4 personas, 2h mínimas), luego $15 por hora adicional
📋 *IVA 15% si requiere factura*

💳 *Pago con tarjeta:* https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA
🏦 *Transferencia:* Produbanco Ahorros, Cta 20059783069, CI 1702683499`;

  return originalResponse + pricingInfo;
}

/**
 * 🧠 Modifica respuesta de Aurora para incluir confirmación si es necesario
 */
export async function enhanceAuroraResponse(originalResponse, userProfile, formResult = null) {
  try {
    // 1. Primero, mejorar respuesta para usuarios recurrentes
    let enhancedResponse = enhanceRecurrentUserResponse(originalResponse, userProfile);

    // 2. Luego, procesar confirmaciones si es necesario
    if (!shouldActivateConfirmation(enhancedResponse)) {
      return {
        enhanced: enhancedResponse !== originalResponse, // True si se modificó para usuario recurrente
        finalMessage: enhancedResponse
      };
    }

    console.log('[Confirmation Helper] Aurora quiere activar confirmación, procesando...');
    console.log('[Confirmation Helper] FormResult disponible:', formResult ? 'SÍ' : 'NO');

    // 🚨 GUARD: Si el usuario acaba de confirmar o ya tiene una confirmación pendiente,
    // evitar re-activar el sistema de confirmación para prevenir loops.
    if (userProfile?.justConfirmed) {
      console.log('[Confirmation Helper] ⚠️ Usuario en ventana justConfirmed - no reactivar confirmación');
      return {
        enhanced: false,
        finalMessage: enhancedResponse,
        note: 'skipped_due_to_justConfirmed'
      };
    }

    if (userProfile?.pendingConfirmation) {
      console.log('[Confirmation Helper] ⚠️ Ya existe pendingConfirmation - evitando re-activación');
      return {
        enhanced: false,
        finalMessage: enhancedResponse,
        note: 'skipped_due_to_existing_pending'
      };
    }

    const confirmationResult = await processAuroraConfirmationRequest(enhancedResponse, userProfile, formResult);

    if (!confirmationResult.success) {
      console.log('[Confirmation Helper] ❌ Error:', confirmationResult.error);
      
      // 🎯 USAR MENSAJE PERSONALIZADO si está disponible
      const errorMessage = confirmationResult.userMessage 
        ? confirmationResult.userMessage
        : generateErrorMessage(confirmationResult.error, confirmationResult.alternatives);
      
      console.log('[Confirmation Helper] 💬 Mensaje de error generado:', errorMessage.substring(0, 100) + '...');
      
      return {
        enhanced: true, // Sí modificamos el mensaje
        finalMessage: errorMessage,
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

/**
 * � Genera mensaje de error amigable cuando falla la confirmación
 */
function generateErrorMessage(error, alternatives) {
  let message = '¡Ups! 😅 ';
  
  // Identificar tipo de error y dar respuesta apropiada
  if (error.includes('Fuera del horario laboral')) {
    message += 'Ese horario está fuera de nuestro horario de atención (7:00 AM - 8:00 PM). ';
    message += '\n\n¿Te gustaría reservar para mañana o en otro horario? 🗓️';
  } else if (error.includes('pasado')) {
    message += 'Ese horario ya pasó. ';
    message += '\n\n¿Prefieres reservar para mañana o más tarde hoy? 📅';
  } else if (error.includes('ocupado') || error.includes('no disponible')) {
    message += 'Ese horario ya está ocupado. ';
    if (alternatives && alternatives.length > 0) {
      message += '\n\nTe sugiero estas alternativas:\n';
      alternatives.forEach(alt => {
        message += `• ${alt}\n`;
      });
    } else {
      message += '\n\n¿Te gustaría probar otro horario? 🕐';
    }
  } else {
    message += 'No pude procesar esa reserva. ';
    message += '\n\n¿Podrías intentar con otro horario o fecha? 🤔';
  }
  
  return message;
}

/**
 * �👥 Extrae número de acompañantes del mensaje
 */
function extractGuestCount(message) {
  const guestPatterns = [
    /(\d+)\s*personas?/i,
    /somos\s+(\d+)/i,
    /(\d+)\s*acompañantes?/i,
    /\+(\d+)/i,
    /con\s+(\d+)/i
  ];
  
  for (const pattern of guestPatterns) {
    const match = message.match(pattern);
    if (match) {
      const count = parseInt(match[1]);
      return Math.max(0, count - 1); // Restar 1 porque el cliente no cuenta como acompañante
    }
  }
  
  return 0; // Sin acompañantes por defecto
}

/**
 * 💰 Calcula precio automáticamente según tipo de servicio
 */
function calculateServicePrice(serviceType, durationHours, guestCount, userProfile, priceMatch) {
  const isFirstTimeUser = !userProfile.freeTrialUsed;
  
  // Si hay precio explícito en el mensaje de Aurora, usar ese
  if (priceMatch) {
    return {
      totalPrice: parseFloat(priceMatch[1]),
      wasFree: false
    };
  }
  
  // SALA DE REUNIÓN - NUNCA GRATIS, SIEMPRE PAGADA
  if (serviceType === 'meetingRoom') {
    // $29 por sala (primeras 2h), luego $15 por hora adicional
    const totalPeople = 1 + guestCount;
    
    // Validar capacidad (3-4 personas)
    if (totalPeople < 3 || totalPeople > 4) {
      console.log(`[PRICING] ⚠️ Sala de Reunión requiere 3-4 personas (solicitaron: ${totalPeople})`);
      return {
        totalPrice: 0,
        wasFree: false,
        error: totalPeople < 3 ? 'Sala de reuniones requiere mínimo 3 personas' : 'Sala de reuniones tiene capacidad máxima de 4 personas'
      };
    }
    
    let totalPrice = 0;
    if (durationHours <= 2) {
      totalPrice = 29.0;
    } else {
      const additionalHours = durationHours - 2;
      totalPrice = 29.0 + (additionalHours * 15.0);
    }
    
    console.log(`[PRICING] 🏢 Sala de Reunión: ${totalPeople} personas × ${durationHours}h = $${totalPrice}`);
    
    return {
      totalPrice,
      wasFree: false
    };
  }
  
  // HOT DESK - Puede ser gratis solo en primera visita
  // $10 por primeras 2h, luego $10 por hora adicional
  
  if (isFirstTimeUser && durationHours <= 2) {
    // Primera visita hasta 2 horas: GRATIS
    console.log('[PRICING] 🆓 Hot Desk GRATIS (primera visita, ≤2h)');
    return {
      totalPrice: 0,
      wasFree: true
    };
  } else if (isFirstTimeUser && durationHours > 2) {
    // Primera visita más de 2h: Gratis las primeras 2h, pagar el resto
    const paidHours = durationHours - 2;
    const totalPrice = paidHours * 10.0;
    console.log(`[PRICING] 🔄 Hot Desk Mixto: 2h gratis + ${paidHours}h × $10 = $${totalPrice}`);
    return {
      totalPrice,
      wasFree: false
    };
  } else {
    // Cliente recurrente: $10 por primeras 2h, luego $10 por hora adicional
    let totalPrice = 0;
    if (durationHours <= 2) {
      totalPrice = 10.0;
    } else {
      const additionalHours = durationHours - 2;
      totalPrice = 10.0 + (additionalHours * 10.0);
    }
    console.log(`[PRICING] 💰 Hot Desk Pagado: ${durationHours}h = $${totalPrice}`);
    return {
      totalPrice,
      wasFree: false
    };
  }
}

export default {
  shouldActivateConfirmation,
  extractReservationData,
  processAuroraConfirmationRequest,
  enhanceAuroraResponse
};