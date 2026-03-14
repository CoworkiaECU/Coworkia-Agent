/**
 * 🎯 Sistema de confirmación SI/NO para visitas de Paula
 * Similar a aurora-confirmation-helper.js pero para propiedades
 * 
 * FLUJO:
 * 1. Paula detecta interés en propiedad
 * 2. Paula sugiere horarios disponibles
 * 3. Usuario dice SI → Sistema agenda visita
 * 4. Sistema crea evento calendario + envía confirmación
 */

import { 
  schedulePropertyVisit, 
  suggestVisitTimes, 
  checkVisitAvailability 
} from './paula-visit-scheduler.js';
import { savePendingConfirmation } from '../perfiles-interacciones/memoria-sqlite.js';
import { normalizeTimeFormat, parseDate } from '../utils/date-time-parser.js';

/**
 * ✅ Detecta si Paula quiere activar confirmación de visita
 */
export function shouldActivateVisitConfirmation(message) {
  const confirmationTriggers = [
    /confirmas?\s+(la\s+)?visita/i,
    /te\s+gustar[ií]a\s+visitarla/i,
    /\?\s*responde\s+(si|sí)/i,
    /agendar\s+visita/i,
    /coordinar\s+visita/i,
    /\[CONFIRMAR_VISITA\]/i,
    /quieres\s+ver\s+(la|esta)\s+propiedad/i
  ];
  
  return confirmationTriggers.some(pattern => pattern.test(message));
}

/**
 * 🎯 Extrae datos de visita de la respuesta de Paula
 */
export function extractVisitData(message, userProfile) {
  try {
    console.log('[PAULA-CONFIRM] 📝 Analizando mensaje:', message.substring(0, 200));
    
    // Detectar código de propiedad (ECU-001, DOM-002, etc.)
    const propertyCodeMatch = message.match(/(ECU|DOM)-\d{3}/i);
    const propertyCode = propertyCodeMatch ? propertyCodeMatch[0].toUpperCase() : null;
    
    // Detectar nombre de propiedad (entre ** o después de "Propiedad:")
    let propertyName = null;
    const nameMatch1 = message.match(/\*\*([^*]+)\*\*/);
    const nameMatch2 = message.match(/Propiedad:\s*([^\n]+)/i);
    const nameMatch3 = message.match(/visita\s+a\s+([^\n,]+)/i);
    
    if (nameMatch1) propertyName = nameMatch1[1].trim();
    else if (nameMatch2) propertyName = nameMatch2[1].trim();
    else if (nameMatch3) propertyName = nameMatch3[1].trim();
    
    // Detectar fecha (mismo sistema que Aurora)
    const dateMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|mañana|ma\u00f1ana|hoy|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/i);
    
    // Detectar horario
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/gi) || 
                     message.match(/(\d{1,2}:\d{2})/g);
    
    // Si no hay horario, devolver null para que Paula pida aclaración
    if (!timeMatch || timeMatch.length === 0) {
      console.log('[PAULA-CONFIRM] ❌ No se detectó horario');
      return null;
    }
    
    // Normalizar horario
    const startTime = normalizeTimeFormat(timeMatch[0], '10:00');
    
    // Fecha por defecto: mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const visitDate = dateMatch ? parseDate(dateMatch[1]) : tomorrow.toISOString().split('T')[0];
    
    // Obtener nombre del cliente
    const clientName = userProfile.name || userProfile.whatsapp_display_name || 'Cliente';
    
    return {
      propertyCode,
      propertyName: propertyName || 'Propiedad de interés',
      propertyAddress: 'Por confirmar', // Paula debe incluirlo en el mensaje
      date: visitDate,
      startTime,
      userId: userProfile.userId,
      clientName,
      clientEmail: userProfile.email || null,
      clientPhone: userProfile.phone_number || userProfile.userId
    };
    
  } catch (error) {
    console.error('[PAULA-CONFIRM] Error extrayendo datos:', error);
    return null;
  }
}



/**
 * 🔄 Activa confirmación de visita desde mensaje de Paula
 */
export async function activateVisitConfirmation(userId, paulaResponse, userProfile) {
  try {
    // Extraer datos de la visita
    const visitData = extractVisitData(paulaResponse, userProfile);
    
    if (!visitData) {
      console.log('[PAULA-CONFIRM] ⚠️ No se pudieron extraer datos de visita');
      return false;
    }
    
    // Guardar confirmación pendiente
    await savePendingConfirmation(userId, {
      type: 'property_visit',
      data: visitData,
      agentName: 'PAULA'
    });
    
    console.log('[PAULA-CONFIRM] ✅ Confirmación pendiente guardada:', visitData.propertyCode);
    return true;
    
  } catch (error) {
    console.error('[PAULA-CONFIRM] Error activando confirmación:', error);
    return false;
  }
}

/**
 * ✅ Confirma visita cuando usuario dice SI
 */
export async function confirmPropertyVisit(userId, userProfile) {
  try {
    // Obtener confirmación pendiente desde memoria
    const { getPendingConfirmation } = await import('../perfiles-interacciones/memoria-sqlite.js');
    const pending = await getPendingConfirmation(userId);
    
    if (!pending || pending.type !== 'property_visit') {
      return {
        success: false,
        message: '❌ No hay ninguna visita pendiente de confirmar.'
      };
    }
    
    const visitData = pending.data;
    
    // Verificar que tenga dirección
    if (!visitData.propertyAddress || visitData.propertyAddress === 'Por confirmar') {
      return {
        success: false,
        message: '⚠️ Necesito la dirección completa de la propiedad para agendar la visita.'
      };
    }
    
    // Agendar visita
    const result = await schedulePropertyVisit(visitData);
    
    return result;
    
  } catch (error) {
    console.error('[PAULA-CONFIRM] Error confirmando visita:', error);
    return {
      success: false,
      message: '❌ Hubo un error al confirmar la visita. Por favor intenta nuevamente.'
    };
  }
}

/**
 * 📋 Genera mensaje de sugerencia de horarios
 */
export async function generateVisitSuggestionMessage(propertyCode, propertyName) {
  try {
    const suggestions = await suggestVisitTimes(propertyCode, 7);
    
    if (suggestions.length === 0) {
      return `⚠️ No hay horarios disponibles en los próximos 7 días para ${propertyName}.

Puedo buscar disponibilidad para fechas más adelante. ¿Qué fecha te gustaría?`;
    }
    
    // Agrupar por día
    const groupedByDay = {};
    suggestions.forEach(slot => {
      if (!groupedByDay[slot.dayName]) {
        groupedByDay[slot.dayName] = [];
      }
      groupedByDay[slot.dayName].push(slot);
    });
    
    let message = `📅 **Horarios disponibles para visitar ${propertyName}:**\n\n`;
    
    Object.keys(groupedByDay).forEach(dayName => {
      const slots = groupedByDay[dayName];
      const times = slots.map(s => {
        const hour = parseInt(s.time.split(':')[0]);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour > 12 ? hour - 12 : hour;
        return `${hour12}${ampm}`;
      }).join(', ');
      
      message += `• **${dayName}**: ${times}\n`;
    });
    
    message += `\n¿Cuál te viene mejor? Una vez confirmes te envío todos los detalles.`;
    
    return message;
    
  } catch (error) {
    console.error('[PAULA-CONFIRM] Error generando sugerencias:', error);
    return '⚠️ Hubo un error al buscar horarios disponibles.';
  }
}

export default {
  shouldActivateVisitConfirmation,
  extractVisitData,
  activateVisitConfirmation,
  confirmPropertyVisit,
  generateVisitSuggestionMessage
};
