/**
 * 📅 Google Calendar Integration Service
 * Crea eventos automáticamente en Google Calendar para reservas de Coworkia
 */

import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';

/**
 * 🔧 Crear cliente autenticado de Google Calendar
 */
async function createCalendarClient() {
  try {
    // Verificar que existe la configuración
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.error('[CALENDAR] ❌ GOOGLE_SERVICE_ACCOUNT_JSON no configurado');
      return null;
    }

    console.log('[CALENDAR] 🔧 Inicializando cliente de Google Calendar...');
    
    // Parsear las credenciales del service account
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    
    // Crear cliente JWT para autenticación
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/calendar'], // Scope para Google Calendar
      null
    );

    // Autorizar el cliente
    await jwtClient.authorize();
    console.log('[CALENDAR] ✅ Cliente autorizado exitosamente');

    // Crear instancia de Google Calendar API
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });
    
    return calendar;
  } catch (error) {
    console.error('[CALENDAR] ❌ Error creando cliente:', error.message);
    return null;
  }
}

/**
 * 📅 Crear evento en Google Calendar
 */
export async function createCalendarEvent(reservationData) {
  console.log('[CALENDAR] 🚀 Creando evento para reserva...');
  
  const calendar = await createCalendarClient();
  if (!calendar) {
    console.error('[CALENDAR] ❌ No se pudo crear cliente de calendario');
    return {
      success: false,
      error: 'Cliente de Google Calendar no disponible'
    };
  }

  try {
    const {
      userName,
      email,
      date,
      startTime,
      endTime,
      serviceType = 'Hot Desk',
      duration,
      price
    } = reservationData;

    // Construir fechas/horas para el evento
    const eventDate = new Date(date);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Crear objetos Date para inicio y fin
    const startDateTime = new Date(eventDate);
    startDateTime.setHours(startHour, startMinute, 0);
    startDateTime.setUTCHours(startDateTime.getHours() + 5); // Ajustar a UTC (Ecuador es UTC-5)

    const endDateTime = new Date(eventDate);
    endDateTime.setHours(endHour, endMinute, 0);
    endDateTime.setUTCHours(endDateTime.getHours() + 5); // Ajustar a UTC

    // Definir el evento
    const event = {
      summary: `🏢 Coworkia - ${serviceType}`,
      description: `
🎯 Reserva confirmada en Coworkia

👤 Cliente: ${userName}
📧 Email: ${email}
🏢 Espacio: ${serviceType}
⏱️ Duración: ${duration || '2 horas'}
💰 Precio: ${price ? `$${price} USD` : 'GRATIS (primera vez)'}

📍 Ubicación: Whymper 403, Edificio Finistere, Quito
📞 Contacto: +593 99 483 7117

¡Te esperamos! 🚀
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Guayaquil' // Zona horaria de Ecuador
      },
      end: {
        dateTime: endDateTime.toISOString(), 
        timeZone: 'America/Guayaquil'
      },
      location: 'Whymper 403, Edificio Finistere, Quito, Ecuador',
      attendees: [
        {
          email: email,
          displayName: userName
        },
        {
          email: process.env.EMAIL_USER || 'secretaria.coworkia@gmail.com',
          displayName: 'Coworkia'
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 día antes
          { method: 'popup', minutes: 60 }        // 1 hora antes
        ]
      },
      colorId: '10', // Verde para reservas confirmadas
      visibility: 'public'
    };

    console.log('[CALENDAR] 📋 Configuración del evento:', {
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      attendees: event.attendees.map(a => a.email)
    });

    // Usar el calendario configurado o crear en calendario principal
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    // Crear el evento
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: 'all' // Enviar invitaciones automáticamente
    });

    console.log('[CALENDAR] ✅ Evento creado exitosamente!');
    console.log(`[CALENDAR] 🔗 URL del evento: ${response.data.htmlLink}`);
    console.log(`[CALENDAR] 📧 ID del evento: ${response.data.id}`);

    return {
      success: true,
      eventId: response.data.id,
      eventUrl: response.data.htmlLink,
      message: 'Evento creado en Google Calendar'
    };

  } catch (error) {
    console.error('[CALENDAR] ❌ Error creando evento:', error.message);
    console.error('[CALENDAR] 📜 Detalles completos:', error);
    
    return {
      success: false,
      error: error.message,
      details: error.code || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 🧪 Probar conexión con Google Calendar
 */
export async function testCalendarConnection() {
  console.log('[CALENDAR] 🧪 Probando conexión con Google Calendar...');
  
  const calendar = await createCalendarClient();
  if (!calendar) {
    return {
      success: false,
      error: 'No se pudo crear cliente de calendario'
    };
  }

  try {
    // Intentar listar calendarios disponibles
    const response = await calendar.calendarList.list();
    
    console.log('[CALENDAR] ✅ Conexión exitosa!');
    console.log(`[CALENDAR] 📊 Calendarios disponibles: ${response.data.items.length}`);
    
    // Mostrar información de calendarios
    response.data.items.forEach((cal, index) => {
      console.log(`[CALENDAR] ${index + 1}. ${cal.summary} (${cal.id})`);
    });

    return {
      success: true,
      calendars: response.data.items,
      message: 'Conexión con Google Calendar exitosa'
    };
    
  } catch (error) {
    console.error('[CALENDAR] ❌ Error probando conexión:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  createCalendarEvent,
  testCalendarConnection
};