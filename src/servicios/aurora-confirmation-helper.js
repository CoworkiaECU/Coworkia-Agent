/**
 * 🎯 Helper para integrar sistema de confirmaciones con Aurora
 * Permite que Aurora active confirmaciones SI/NO desde sus respuestas
 */

import { generateConfirmationMessage } from './confirmation-flow.js';
import { savePendingConfirmation, getPaymentInfo } from '../perfiles-interacciones/memoria-sqlite.js';
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
      console.log('[DEBUG] 🏢 DETECTADO: Sala de Reunión solicitada');
    }

    // Buscar patrones de fecha y hora en la respuesta
    const dateMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|mañana|hoy|lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i);
    
    // 🔧 MEJORAR: Detectar horarios en múltiples formatos
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/g) || 
                     message.match(/(\d{1,2}:\d{2})/g) ||
                     message.match(/(\d{1,2})\s*(am|pm|AM|PM)/g);
    
    const priceMatch = message.match(/\$(\d+\.?\d*)/);
    const durationMatch = message.match(/(\d+)\s*hora[s]?/i);

    console.log('[DEBUG] Mensaje analizado:', message);
    console.log('[DEBUG] timeMatch encontrado:', timeMatch);

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
      console.log('[DEBUG] 🕐 startTime normalizado:', startTime);
      
      // 🎯 NUEVA LÓGICA: Solo mirar durationMatch, IGNORAR segundo horario
      if (durationMatch) {
        const requestedDuration = parseInt(durationMatch[1]);
        console.log('[DEBUG] ⏱️ Duración solicitada explícitamente:', requestedDuration, 'horas');
        
        // SOLO permitir más de 2h si el usuario lo dice EXPLÍCITAMENTE
        if (requestedDuration > 2 && requestedDuration <= 8) {
          durationHours = requestedDuration;
          console.log('[DEBUG] ✅ Aceptando duración explícita:', durationHours, 'horas');
        } else if (requestedDuration > 8) {
          durationHours = 2;
          console.log('[DEBUG] ⚠️ Duración muy larga (>8h) - LIMITANDO A 2 HORAS');
        } else {
          durationHours = requestedDuration;
        }
      } else {
        // Sin duración explícita = 2 horas por defecto
        durationHours = 2;
        console.log('[DEBUG] 📋 Sin duración especificada - Usando 2 HORAS por defecto');
      }
      
      // 🎯 CALCULAR endTime desde startTime + duración validada
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinutes = parseInt(startTime.split(':')[1] || '0');
      const endHour = startHour + durationHours;
      endTime = `${endHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
      
      console.log('[DEBUG] 📅 Horario final:', startTime, '-', endTime, `(${durationHours}h)`);
    }

    const reservationDate = dateMatch ? parseDate(dateMatch[1]) : tomorrow.toISOString().split('T')[0];
    
    // 🚨 VALIDACIÓN: Usar zona horaria de Ecuador (UTC-5)
    const now = new Date();
    const ecuadorOffset = -5 * 60; // Ecuador es UTC-5
    const ecuadorTime = new Date(now.getTime() + (ecuadorOffset * 60 * 1000));
    const reservationDateTime = new Date(`${reservationDate}T${startTime}:00`);
    
    console.log('[VALIDATION] Hora Ecuador actual:', ecuadorTime.toTimeString());
    console.log('[VALIDATION] Horario solicitado:', startTime, 'fecha:', reservationDate);
    
    // Solo validar si es el mismo día
    if (reservationDate === ecuadorTime.toISOString().split('T')[0]) {
      const currentEcuadorHour = ecuadorTime.getHours();
      const requestedHour = parseInt(startTime.split(':')[0]);
      
      if (requestedHour <= currentEcuadorHour) {
        console.warn('[VALIDATION] Horario en el pasado detectado Ecuador:', startTime, 'actual Ecuador:', currentEcuadorHour);
        // Ajustar a próxima hora disponible en Ecuador
        const nextHour = currentEcuadorHour + 1;
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
  
  // Si ya está en formato HH:MM, verificar y retornar
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return timeStr.padStart(5, '0');
  }
  
  // Extraer componentes
  const match = timeStr.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/);
  if (!match) return '09:00';
  
  let hour = parseInt(match[1]);
  let minutes = parseInt(match[2] || '0');
  const period = match[3];
  
  // Convertir AM/PM a formato 24h
  if (period === 'pm' && hour !== 12) {
    hour += 12;
  } else if (period === 'am' && hour === 12) {
    hour = 0;
  }
  
  // Asegurar formato válido
  if (hour > 23) hour = 23;
  if (minutes > 59) minutes = 0;
  
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * �📅 Parsea fecha en diferentes formatos
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
🏦 *Transferencia:* Banco Pichincha, Cta 2207158516`;

  return originalResponse + pricingInfo;
}

/**
 * 🧠 Modifica respuesta de Aurora para incluir confirmación si es necesario
 */
export async function enhanceAuroraResponse(originalResponse, userProfile) {
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

    const confirmationResult = await processAuroraConfirmationRequest(enhancedResponse, userProfile);

    if (!confirmationResult.success) {
      console.log('[Confirmation Helper] Error:', confirmationResult.error);
      return {
        enhanced: enhancedResponse !== originalResponse,
        finalMessage: enhancedResponse,
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
 * 👥 Extrae número de acompañantes del mensaje
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