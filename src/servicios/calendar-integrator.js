/**
 * 📅 Universal Calendar Integrator
 * 
 * Sistema unificado para que todos los agentes gestionen eventos de calendario
 * Soporta: Reservas (Aurora), Citas Médicas (Ángela), Reuniones (Enzo), etc.
 */

import { createCalendarEvent, testCalendarConnection } from './google-calendar.js';
import { conversationAdapter } from '../database/conversationAdapter.js';

/**
 * 🎯 Tipos de eventos soportados
 */
export const EVENT_TYPES = {
  RESERVATION: 'reservation',      // Aurora: reservas de espacios
  MEDICAL: 'medical_appointment',   // Ángela: citas médicas
  MEETING: 'business_meeting',      // Enzo: reuniones de marketing
  WORKSHOP: 'workshop',             // Aluna: talleres/eventos
  QUOTE_VISIT: 'quote_visit',       // Axel: visitas para cotización
  CONSULTATION: 'consultation'      // Gabi: asesorías financieras
};

/**
 * 🎨 Colores de eventos por tipo
 */
const EVENT_COLORS = {
  [EVENT_TYPES.RESERVATION]: '10',      // Verde (reservas confirmadas)
  [EVENT_TYPES.MEDICAL]: '4',           // Rosa (salud)
  [EVENT_TYPES.MEETING]: '9',           // Azul (negocios)
  [EVENT_TYPES.WORKSHOP]: '5',          // Amarillo (eventos)
  [EVENT_TYPES.QUOTE_VISIT]: '11',      // Rojo (urgente/cotización)
  [EVENT_TYPES.CONSULTATION]: '7'       // Celeste (consultoría)
};

/**
 * 🔧 Crear evento universal en calendario
 */
export async function createUniversalEvent({
  // Datos básicos
  userId,
  userName,
  userEmail,
  
  // Tipo de evento
  eventType = EVENT_TYPES.RESERVATION,
  agent,
  topic,
  
  // Fecha y hora
  date,           // YYYY-MM-DD
  startTime,      // HH:MM
  endTime,        // HH:MM
  duration,       // "2 horas"
  
  // Detalles específicos
  title,          // Título personalizado (opcional)
  description,    // Descripción adicional
  location,       // Ubicación (opcional, default: Coworkia)
  
  // Metadata adicional
  metadata = {},
  
  // Flags
  isPaid = false,
  paymentMethod = null,
  price = 0
}) {
  
  try {
    console.log(`[CALENDAR INTEGRATOR] 📅 Creando evento tipo: ${eventType}`);
    
    // Construir título basado en tipo
    const eventTitle = title || generateEventTitle(eventType, userName, metadata);
    
    // Construir descripción basada en tipo
    const eventDescription = generateEventDescription({
      eventType,
      agent,
      userName,
      userEmail,
      description,
      metadata,
      isPaid,
      paymentMethod,
      price,
      duration,
      date,
      startTime,
      endTime
    });
    
    // Datos para Google Calendar
    const calendarData = {
      userName,
      email: userEmail || 'info@coworkia.com',
      date,
      startTime,
      endTime,
      serviceType: eventTitle,
      duration,
      price: isPaid ? price : 0,
      paymentMethod: paymentMethod || 'pending',
      colorId: EVENT_COLORS[eventType] || '10',
      customDescription: eventDescription,
      location: location || 'Whymper 403, Edificio Finistere, Quito, Ecuador'
    };
    
    // Crear evento en Google Calendar
    const result = await createCalendarEvent(calendarData);
    
    if (result.success) {
      console.log('[CALENDAR INTEGRATOR] ✅ Evento creado exitosamente');
      
      // Guardar en base de datos unificada
      await saveEventToDatabase({
        userId,
        agent,
        topic,
        eventType,
        eventId: result.eventId,
        eventUrl: result.eventUrl,
        date,
        startTime,
        endTime,
        metadata: {
          ...metadata,
          title: eventTitle,
          description: eventDescription,
          isPaid,
          paymentMethod,
          price
        }
      });
      
      return {
        success: true,
        eventId: result.eventId,
        eventUrl: result.eventUrl,
        message: 'Evento agendado correctamente'
      };
    } else {
      console.error('[CALENDAR INTEGRATOR] ❌ Error creando evento:', result.error);
      return result;
    }
    
  } catch (error) {
    console.error('[CALENDAR INTEGRATOR] ❌ Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🏷️ Genera título de evento según tipo (incluye agente + contexto)
 */
function generateEventTitle(eventType, userName, metadata) {
  // Prefijo del agente
  const agentPrefix = metadata.agent ? `${metadata.agent}: ` : '';
  
  // Contexto adicional (truncado a 40 chars si es muy largo)
  const context = metadata.context ? ` - ${metadata.context.substring(0, 40)}` : '';
  
  switch (eventType) {
    case EVENT_TYPES.RESERVATION:
      const space = metadata.spaceType || 'Hot Desk';
      const number = metadata.spaceNumber ? ` ${metadata.spaceNumber}` : '';
      const freeNote = metadata.isFreeVisit ? ' - Primera visita gratis' : '';
      return `${agentPrefix}${space}${number} - ${userName}${freeNote}${context}`;
      
    case EVENT_TYPES.MEDICAL:
      const specialty = metadata.specialty || 'Consulta Médica';
      return `${agentPrefix}${specialty} - ${userName}${context}`;
      
    case EVENT_TYPES.MEETING:
      const topic = metadata.meetingTopic || 'Reunión';
      return `${agentPrefix}${topic} - ${userName}${context}`;
      
    case EVENT_TYPES.WORKSHOP:
      const workshop = metadata.workshopName || 'Taller';
      return `${agentPrefix}${workshop} - ${userName}${context}`;
      
    case EVENT_TYPES.QUOTE_VISIT:
      const vehicle = metadata.vehicleInfo || 'Vehículo';
      const damage = metadata.damageType ? ` - ${metadata.damageType.substring(0, 30)}` : '';
      return `${agentPrefix}Cotización ${vehicle}${damage} - ${userName}`;
      
    case EVENT_TYPES.CONSULTATION:
      const service = metadata.consultationType || 'Asesoría';
      return `${agentPrefix}${service} - ${userName}${context}`;
      
    default:
      return `${agentPrefix}Evento - ${userName}${context}`;
  }
}

/**
 * 📝 Genera descripción de evento según tipo
 */
function generateEventDescription(data) {
  const {
    eventType,
    agent,
    userName,
    userEmail,
    description,
    metadata,
    isPaid,
    paymentMethod,
    price,
    duration,
    date,
    startTime,
    endTime
  } = data;
  
  // Emoji y título según tipo
  const headers = {
    [EVENT_TYPES.RESERVATION]: '🏢 Reserva Confirmada - Coworkia',
    [EVENT_TYPES.MEDICAL]: '💚 Cita Médica - MedBeneficios',
    [EVENT_TYPES.MEETING]: '💡 Reunión de Negocios - MarketingLab',
    [EVENT_TYPES.WORKSHOP]: '📚 Taller/Evento - Coworkia',
    [EVENT_TYPES.QUOTE_VISIT]: '🚗 Visita Cotización - The PaintBull',
    [EVENT_TYPES.CONSULTATION]: '💼 Consultoría - GR Consulting'
  };
  
  const header = headers[eventType] || '📅 Evento Agendado';
  
  // Información de pago
  const paymentInfo = isPaid 
    ? `💳 PAGADO - ${paymentMethod || 'Método no especificado'}\n💰 Monto: $${price} USD`
    : '💰 Sin costo / Pago pendiente';
  
  // Descripción base
  let desc = `
${header}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${paymentInfo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Nombre: ${userName}
📧 Email: ${userEmail}
🤖 Agente: ${agent || 'Sistema'}
📅 Fecha: ${date}
🕐 Horario: ${startTime} - ${endTime}
⏱️ Duración: ${duration || 'Variable'}
`;

  // Agregar detalles específicos por tipo
  if (eventType === EVENT_TYPES.RESERVATION) {
    desc += `\n🏢 Espacio: ${metadata.spaceType || 'Hot Desk'}`;
    if (metadata.guestCount) {
      desc += `\n👥 Personas: ${1 + metadata.guestCount}`;
    }
  } else if (eventType === EVENT_TYPES.MEDICAL) {
    desc += `\n🏥 Especialidad: ${metadata.specialty || 'No especificado'}`;
    if (metadata.doctorName) {
      desc += `\n👨‍⚕️ Doctor(a): ${metadata.doctorName}`;
    }
  } else if (eventType === EVENT_TYPES.MEETING) {
    desc += `\n📋 Tema: ${metadata.meetingTopic || 'No especificado'}`;
    if (metadata.attendees) {
      desc += `\n👥 Asistentes: ${metadata.attendees}`;
    }
  } else if (eventType === EVENT_TYPES.QUOTE_VISIT) {
    desc += `\n🚗 Vehículo: ${metadata.vehicleInfo || 'No especificado'}`;
    if (metadata.damageType) {
      desc += `\n💥 Daño: ${metadata.damageType}`;
    }
  } else if (eventType === EVENT_TYPES.CONSULTATION) {
    desc += `\n💼 Tipo: ${metadata.consultationType || 'General'}`;
    if (metadata.consultationReason) {
      desc += `\n📋 Motivo: ${metadata.consultationReason}`;
    }
  }
  
  // Agregar descripción personalizada si existe
  if (description) {
    desc += `\n\n📝 Notas adicionales:\n${description}`;
  }
  
  // Footer con ubicación
  desc += `\n\n📍 Ubicación: Whymper 403, Edificio Finistere, Quito`;
  desc += `\n🗺️ Google Maps: https://maps.app.goo.gl/Nqy6YeGuxo3czEt66`;
  desc += `\n📞 Contacto: +593 99 483 7117`;
  desc += `\n\n¡Nos vemos pronto! 🚀`;
  
  return desc.trim();
}

/**
 * 💾 Guarda evento en base de datos unificada
 */
async function saveEventToDatabase(eventData) {
  try {
    const {
      userId,
      agent,
      topic,
      eventType,
      eventId,
      eventUrl,
      date,
      startTime,
      endTime,
      metadata
    } = eventData;
    
    // Guardar como mensaje especial tipo 'event'
    await conversationAdapter.saveConversationMessage(
      userId,
      'system',
      `Evento agendado: ${metadata.title}`,
      topic || `calendar_${eventType}`,
      {
        type: 'calendar_event',
        eventType,
        eventId,
        eventUrl,
        date,
        startTime,
        endTime,
        agent,
        ...metadata
      }
    );
    
    console.log('[CALENDAR INTEGRATOR] 💾 Evento guardado en BD');
    
  } catch (error) {
    console.error('[CALENDAR INTEGRATOR] ⚠️ Error guardando en BD:', error);
    // No fallar si no se puede guardar en BD
  }
}

/**
 * 📋 Obtiene eventos agendados de un usuario
 */
export async function getUserScheduledEvents(userId, agent = null, limit = 10) {
  try {
    // Buscar mensajes tipo 'calendar_event' en conversaciones
    const history = await conversationAdapter.loadConversationHistory(
      userId,
      agent,
      limit * 2 // Buscar más para filtrar
    );
    
    const events = history
      .filter(msg => msg.metadata?.type === 'calendar_event')
      .slice(0, limit);
    
    return events.map(msg => ({
      date: msg.metadata.date,
      startTime: msg.metadata.startTime,
      endTime: msg.metadata.endTime,
      title: msg.metadata.title,
      eventType: msg.metadata.eventType,
      eventUrl: msg.metadata.eventUrl,
      createdAt: msg.timestamp
    }));
    
  } catch (error) {
    console.error('[CALENDAR INTEGRATOR] ❌ Error obteniendo eventos:', error);
    return [];
  }
}

/**
 * 🧪 Probar integración de calendario
 */
export async function testCalendarIntegration() {
  console.log('[CALENDAR INTEGRATOR] 🧪 Probando integración universal...');
  
  const testResult = await testCalendarConnection();
  
  if (testResult.success) {
    console.log('[CALENDAR INTEGRATOR] ✅ Integración funcionando correctamente');
    return {
      success: true,
      calendars: testResult.calendars,
      message: 'Sistema de calendario listo para todos los agentes'
    };
  } else {
    console.log('[CALENDAR INTEGRATOR] ❌ Problema con integración');
    return testResult;
  }
}

/**
 * 🎯 Helpers rápidos por agente
 */
export const AgentCalendarHelpers = {
  
  // Aurora: Reservas de espacios
  async createReservation(userId, userName, userEmail, {
    date, startTime, endTime, duration,
    spaceType = 'Hot Desk', spaceNumber, guestCount = 0,
    isPaid = false, paymentMethod, price = 0,
    context = null,        // Contexto de la conversación
    isFreeVisit = false    // Si es primera visita gratis
  }) {
    return createUniversalEvent({
      userId, userName, userEmail,
      eventType: EVENT_TYPES.RESERVATION,
      agent: 'AURORA',
      topic: 'reserva_espacio',
      date, startTime, endTime, duration,
      isPaid, paymentMethod, price,
      metadata: { 
        agent: 'AURORA',
        spaceType, 
        spaceNumber, 
        guestCount,
        isFreeVisit,
        context 
      }
    });
  },
  
  // Ángela: Citas médicas
  async createMedicalAppointment(userId, userName, userEmail, {
    date, startTime, endTime, duration,
    specialty, doctorName, clinic,
    context = null  // Ej: "Dolor pecho recurrente", "Control rutina"
  }) {
    return createUniversalEvent({
      userId, userName, userEmail,
      eventType: EVENT_TYPES.MEDICAL,
      agent: 'ANGELA',
      topic: 'salud_bienestar',
      date, startTime, endTime, duration,
      location: clinic || 'A confirmar',
      metadata: { 
        agent: 'ÁNGELA',
        specialty, 
        doctorName,
        context 
      }
    });
  },
  
  // Axel: Visitas para cotización
  async createQuoteVisit(userId, userName, userEmail, {
    date, startTime, endTime,
    vehicleInfo, damageType,
    context = null  // No necesario, damageType ya es el contexto
  }) {
    return createUniversalEvent({
      userId, userName, userEmail,
      eventType: EVENT_TYPES.QUOTE_VISIT,
      agent: 'AXEL',
      topic: 'reparacion_vehicular',
      date, startTime, endTime,
      duration: '1 hora',
      location: 'The PaintBull - Taller',
      metadata: { 
        agent: 'AXEL',
        vehicleInfo, 
        damageType,
        context 
      }
    });
  },
  
  // Enzo: Reuniones de marketing
  async createMarketingMeeting(userId, userName, userEmail, {
    date, startTime, endTime, duration,
    meetingTopic, attendees,
    context = null  // Ej: "Lanzamiento producto nuevo", "Crisis reputacional"
  }) {
    return createUniversalEvent({
      userId, userName, userEmail,
      eventType: EVENT_TYPES.MEETING,
      agent: 'ENZO',
      topic: 'marketing_ia',
      date, startTime, endTime, duration,
      metadata: { 
        agent: 'ENZO',
        meetingTopic, 
        attendees,
        context 
      }
    });
  },
  
  // Gabi: Consultoría financiera
  async createConsultation(userId, userName, userEmail, {
    date, startTime, endTime, duration,
    consultationType, consultationReason,
    context = null  // Ej: "Cierre fiscal urgente", "Auditoría UAFE"
  }) {
    return createUniversalEvent({
      userId, userName, userEmail,
      eventType: EVENT_TYPES.CONSULTATION,
      agent: 'GABI',
      topic: 'finanzas_contabilidad',
      date, startTime, endTime, duration,
      metadata: { 
        agent: 'GABI',
        consultationType, 
        consultationReason,
        context 
      }
    });
  }
};

export default {
  createUniversalEvent,
  getUserScheduledEvents,
  testCalendarIntegration,
  AgentCalendarHelpers,
  EVENT_TYPES
};
