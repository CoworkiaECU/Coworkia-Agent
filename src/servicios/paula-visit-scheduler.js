/**
 * 📅 PAULA - Sistema de Agendamiento de Visitas a Propiedades
 * Similar a aurora-confirmation-helper.js pero para bienes raíces
 * 
 * FLUJO:
 * 1. Cliente muestra interés en propiedad específica
 * 2. Paula ofrece horarios disponibles
 * 3. Cliente dice SI → Se agenda visita
 * 4. Sistema crea evento calendario + envía confirmación
 * 
 * DIFERENCIAS con Aurora:
 * - Visitas son 1 hora (no variables)
 * - No hay costo (asesoría gratuita)
 * - Se agenda en propiedades específicas (con dirección)
 * - Incluye contacto del agente de campo
 */

import databaseService from '../database/database.js';
import { createCalendarEvent } from './google-calendar.js';
import { sendEmail } from './email.js';
import { savePendingConfirmation, clearPendingConfirmation } from '../perfiles-interacciones/memoria-sqlite.js';
import { generateVisitConfirmationEmail } from './email-templates-paula.js';
import { generateSequentialCode } from '../utils/code-generator.js';

/**
 * ️ Verifica disponibilidad de horario para visitas
 * @param {string} date - Fecha YYYY-MM-DD
 * @param {string} startTime - Hora HH:MM
 * @param {string} propertyCode - Código de propiedad (ECU-001, DOM-002, etc.)
 * @returns {Promise<{available: boolean, reason?: string}>}
 */
export async function checkVisitAvailability(date, startTime, propertyCode) {
  try {
    await databaseService.initialize();
    
    // Validar fecha no sea pasada
    const visitDate = new Date(date + 'T00:00:00-05:00'); // Ecuador timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (visitDate < today) {
      return { 
        available: false, 
        reason: 'La fecha no puede ser en el pasado' 
      };
    }
    
    // Validar horario de visitas: martes, jueves y sábado únicamente
    const visitDayOfWeek = new Date(date + 'T00:00:00-05:00').getDay();
    const VISIT_DAYS = [2, 4, 6]; // Martes=2, Jueves=4, Sábado=6
    if (!VISIT_DAYS.includes(visitDayOfWeek)) {
      return { 
        available: false, 
        reason: 'Las visitas solo están disponibles martes, jueves y sábados' 
      };
    }

    // Validar horario de visitas (9am - 6pm)
    const [hour] = startTime.split(':').map(Number);
    if (hour < 9 || hour >= 18) {
      return { 
        available: false, 
        reason: 'Las visitas están disponibles de 9am a 6pm' 
      };
    }
    
    // Validar no haya otra visita en el mismo horario para esa propiedad
    const existingVisit = await databaseService.get(
      `SELECT id FROM property_visits 
       WHERE property_code = ? 
       AND date = ? 
       AND start_time = ? 
       AND status != 'cancelled'`,
      [propertyCode, date, startTime]
    );
    
    if (existingVisit) {
      return { 
        available: false, 
        reason: 'Este horario ya está reservado para esta propiedad' 
      };
    }
    
    return { available: true };
    
  } catch (error) {
    console.error('[PAULA-SCHEDULER] Error verificando disponibilidad:', error);
    return { 
      available: false, 
      reason: 'Error verificando disponibilidad' 
    };
  }
}

/**
 * 📋 Sugiere horarios disponibles para una propiedad
 * @param {string} propertyCode - Código de propiedad
 * @param {number} daysAhead - Días hacia adelante (default: 7)
 * @returns {Promise<Array>} Lista de horarios disponibles
 */
export async function suggestVisitTimes(propertyCode, daysAhead = 7) {
  const suggestions = [];
  const today = new Date();
  
  // Horarios de visita: 10am, 11am, 3pm, 4pm, 5pm
  const preferredTimes = ['10:00', '11:00', '15:00', '16:00', '17:00'];
  // Días de visita: martes=2, jueves=4, sábado=6
  const VISIT_DAYS = [2, 4, 6];
  
  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Solo martes, jueves y sábados
    if (!VISIT_DAYS.includes(date.getDay())) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    
    for (const time of preferredTimes) {
      const check = await checkVisitAvailability(dateStr, time, propertyCode);
      if (check.available) {
        suggestions.push({
          date: dateStr,
          time,
          dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][date.getDay()],
          formatted: formatVisitDateTime(dateStr, time)
        });
        
        // Limitar a 6 sugerencias
        if (suggestions.length >= 6) {
          return suggestions;
        }
      }
    }
  }
  
  return suggestions;
}

/**
 * 📝 Formatea fecha/hora para mostrar al usuario
 */
function formatVisitDateTime(date, time) {
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum > 12 ? hourNum - 12 : hourNum;
  
  return `${day}/${month}/${year} a las ${hour12}:${minute}${ampm}`;
}

/**
 * ✅ Confirma y agenda una visita a propiedad
 * @param {Object} visitData - Datos de la visita
 * @returns {Promise<Object>}
 */
export async function schedulePropertyVisit(visitData) {
  try {
    await databaseService.initialize();
    console.log('[PAULA-SCHEDULER] 📅 Iniciando agendamiento:', visitData);
    
    const {
      userId,
      propertyCode,
      propertyName,
      propertyAddress,
      date,
      startTime,
      clientName,
      clientEmail,
      clientPhone
    } = visitData;
    
    // Validar disponibilidad
    const availability = await checkVisitAvailability(date, startTime, propertyCode);
    if (!availability.available) {
      return {
        success: false,
        message: `❌ ${availability.reason}`,
        reason: availability.reason
      };
    }
    
    // Generar código único
    const visitId = await generateSequentialCode('PAU', 'property_visits', 'id', 3);
    
    // Calcular hora de fin (1 hora después)
    const [hour, minute] = startTime.split(':').map(Number);
    const endHour = hour + 1;
    const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Guardar en base de datos
    const insertQuery = `
      INSERT INTO property_visits (
        id, user_phone, property_code, property_name, property_address,
        date, start_time, end_time, duration_minutes,
        client_name, client_email, client_phone,
        status, created_at, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await databaseService.run(insertQuery, [
      visitId,
      userId,
      propertyCode,
      propertyName,
      propertyAddress,
      date,
      startTime,
      endTime,
      60, // 1 hora
      clientName,
      clientEmail || null,
      clientPhone || userId,
      'confirmed',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    
    console.log('[PAULA-SCHEDULER] ✅ Visita guardada en BD:', visitId);
    
    // Crear evento en Google Calendar
    let calendarEventId = null;
    try {
      const calendarEvent = await createCalendarEvent({
        title: `🏡 Visita: ${propertyName}`,
        description: `Visita a propiedad ${propertyCode}\n\nCliente: ${clientName}\nTeléfono: ${clientPhone}\n\nDirección:\n${propertyAddress}\n\n📋 Agendado por Paula - PropElite Bienes Raíces`,
        location: propertyAddress,
        start: `${date}T${startTime}:00-05:00`,
        durationMinutes: 60,
        attendees: clientEmail ? [clientEmail] : []
      });
      
      if (calendarEvent?.id) {
        calendarEventId = calendarEvent.id;
        
        // Actualizar con calendar_event_id
        await databaseService.run(
          'UPDATE property_visits SET calendar_event_id = ? WHERE id = ?',
          [calendarEventId, visitId]
        );
        
        console.log('[PAULA-SCHEDULER] 📅 Evento creado en Google Calendar:', calendarEventId);
      }
    } catch (calError) {
      console.error('[PAULA-SCHEDULER] ⚠️ Error creando evento calendario:', calError.message);
      // Continuar sin calendario
    }
    
    // Enviar email de confirmación
    if (clientEmail) {
      try {
        const emailContent = generateVisitConfirmationEmail({
          visitId,
          clientName,
          propertyName,
          propertyCode,
          propertyAddress,
          date,
          time: startTime,
          formatted: formatVisitDateTime(date, startTime)
        });
        
        await sendEmail(
          clientEmail,
          emailContent.subject,
          emailContent.html
        );
        
        console.log('[PAULA-SCHEDULER] ✉️ Email enviado a:', clientEmail);
      } catch (emailError) {
        console.error('[PAULA-SCHEDULER] ⚠️ Error enviando email:', emailError.message);
        // Continuar sin email
      }
    }
    
    // Limpiar confirmación pendiente
    await clearPendingConfirmation(userId);
    
    return {
      success: true,
      visitId,
      message: `✅ **Visita agendada exitosamente**

📋 Código: ${visitId}
🏡 Propiedad: ${propertyName}
📍 Dirección: ${propertyAddress}
📅 Fecha: ${formatVisitDateTime(date, startTime)}
⏱️ Duración: 1 hora

**📞 Detalles importantes:**
• Un agente de PropElite te recibirá en la propiedad
• Llega 5 minutos antes
• Trae identificación oficial
• Podrás hacer todas las preguntas que necesites

**📲 Si necesitas reagendar:**
Avísame con mínimo 24h de anticipación.

¿Tienes alguna pregunta sobre la visita?`,
      calendarEventId
    };
    
  } catch (error) {
    console.error('[PAULA-SCHEDULER] ❌ Error agendando visita:', error);
    return {
      success: false,
      message: '❌ Hubo un error al agendar la visita. Por favor intenta nuevamente.'
    };
  }
}

/**
 * 🔄 Reagenda una visita existente
 */
export async function reschedulePropertyVisit(visitId, newDate, newTime) {
  try {
    // Obtener visita actual
    const visit = await databaseService.get(
      'SELECT * FROM property_visits WHERE id = ?',
      [visitId]
    );
    
    if (!visit) {
      return {
        success: false,
        message: '❌ Visita no encontrada'
      };
    }
    
    // Verificar disponibilidad nueva fecha
    const availability = await checkVisitAvailability(newDate, newTime, visit.property_code);
    if (!availability.available) {
      return {
        success: false,
        message: `❌ ${availability.reason}`
      };
    }
    
    // Calcular nueva hora de fin
    const [hour, minute] = newTime.split(':').map(Number);
    const endHour = hour + 1;
    const newEndTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Actualizar en BD
    await databaseService.run(
      `UPDATE property_visits 
       SET date = ?, start_time = ?, end_time = ?, updated_at = ?
       WHERE id = ?`,
      [newDate, newTime, newEndTime, new Date().toISOString(), visitId]
    );
    
    // TODO: Actualizar evento en Google Calendar si existe
    
    return {
      success: true,
      message: `✅ Visita reagendada exitosamente

📋 Código: ${visitId}
📅 Nueva fecha: ${formatVisitDateTime(newDate, newTime)}

Te llegará un email de confirmación.`
    };
    
  } catch (error) {
    console.error('[PAULA-SCHEDULER] Error reagendando:', error);
    return {
      success: false,
      message: '❌ Error al reagendar la visita'
    };
  }
}

/**
 * ❌ Cancela una visita agendada
 */
export async function cancelPropertyVisit(visitId, reason = '') {
  try {
    const visit = await databaseService.get(
      'SELECT * FROM property_visits WHERE id = ?',
      [visitId]
    );
    
    if (!visit) {
      return {
        success: false,
        message: '❌ Visita no encontrada'
      };
    }
    
    // Actualizar estado
    await databaseService.run(
      `UPDATE property_visits 
       SET status = ?, cancellation_reason = ?, updated_at = ?
       WHERE id = ?`,
      ['cancelled', reason, new Date().toISOString(), visitId]
    );
    
    // TODO: Cancelar evento en Google Calendar
    
    return {
      success: true,
      message: `✅ Visita cancelada

📋 Código: ${visitId}

Si cambias de opinión, puedo agendar una nueva visita en otro horario.`
    };
    
  } catch (error) {
    console.error('[PAULA-SCHEDULER] Error cancelando:', error);
    return {
      success: false,
      message: '❌ Error al cancelar la visita'
    };
  }
}

/**
 * 📋 Obtiene visitas de un usuario
 */
export async function getUserVisits(userId) {
  try {
    const visits = await databaseService.all(
      `SELECT * FROM property_visits 
       WHERE user_phone = ? 
       AND status != 'cancelled'
       ORDER BY date ASC, start_time ASC`,
      [userId]
    );
    
    return visits;
  } catch (error) {
    console.error('[PAULA-SCHEDULER] Error obteniendo visitas:', error);
    return [];
  }
}

/**
 * 📊 Estadísticas de visitas por propiedad
 */
export async function getPropertyVisitStats(propertyCode) {
  try {
    const stats = await databaseService.get(
      `SELECT 
        COUNT(*) as total_visits,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
       FROM property_visits 
       WHERE property_code = ?`,
      [propertyCode]
    );
    
    return stats;
  } catch (error) {
    console.error('[PAULA-SCHEDULER] Error obteniendo stats:', error);
    return null;
  }
}

export default {
  checkVisitAvailability,
  suggestVisitTimes,
  schedulePropertyVisit,
  reschedulePropertyVisit,
  cancelPropertyVisit,
  getUserVisits,
  getPropertyVisitStats
};
