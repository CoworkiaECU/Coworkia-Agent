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
    
    console.log('[CALENDAR] 📋 Credenciales cargadas:', {
      client_email: credentials.client_email,
      project_id: credentials.project_id,
      private_key_length: credentials.private_key ? credentials.private_key.length : 0
    });
    
    // Asegurar formato correcto de private_key
    let privateKey = credentials.private_key;
    if (privateKey && !privateKey.includes('\\n')) {
      // Ya tiene saltos de línea reales, no necesita conversión
      privateKey = privateKey;
    } else if (privateKey) {
      // Convertir \n a saltos de línea reales
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Crear cliente JWT para autenticación con objeto de credenciales
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

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
      email = 'prueba@coworkia.com', // Email por defecto para tests
      date,
      startTime,
      endTime,
      serviceType = 'Hot Desk',
      duration,
      price,
      isTest = false
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

    // Formato del título con acompañantes
    const guestCount = reservationData.guestCount || 0;
    const guestSuffix = guestCount > 0 ? ` +${guestCount}` : '';
    const eventTitle = `${serviceType} ${userName}${guestSuffix}`;
    
    // Definir el evento
    const event = {
      summary: eventTitle, // Ejemplo: "Hot Desk Diego Villota +2"
      description: `
🎯 Reserva confirmada en Coworkia

👤 Cliente: ${userName}
📧 Email: ${email}
🏢 Espacio: ${serviceType}
👥 Personas: ${1 + guestCount} (cliente + ${guestCount} acompañantes)
⏱️ Duración: ${duration || '2 horas'}
💰 Precio: ${price ? `$${price} USD` : 'GRATIS (primera vez)'}

📅 Fecha: ${date}
🕐 Horario: ${startTime} - ${endTime}

📍 Ubicación: Whymper 403, Edificio Finistere, Quito
🗺️ Google Maps: https://maps.app.goo.gl/ZrKqKw8vBm2eZeK69
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
      // NOTA: Service Accounts no pueden invitar attendees sin Domain-Wide Delegation
      // Solo creamos el evento como referencia. Las notificaciones van por email separado.
      reminders: {
        useDefault: false,
        overrides: [
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
      location: event.location
    });

    // Usar el calendario configurado o crear en calendario principal
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    // Crear el evento (sin invitaciones - las notificaciones van por email)
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: 'none' // No enviar invitaciones automáticas
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