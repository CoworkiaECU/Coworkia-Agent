/**
 * 📅 Google Calendar Integration Service
 * Crea eventos automáticamente en Google Calendar para reservas de Coworkia
 */

import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';
import { runWithRetry } from './external-dispatcher.js';

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
    await runWithRetry('google-calendar:authorize', () => jwtClient.authorize(), {
      maxRetries: 2,
      backoffBaseMs: 500,
      circuitId: 'google-calendar-auth'
    });
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
      isTest = false,
      colorId = '10',              // Color personalizable
      customDescription = null,     // Descripción personalizada
      location: customLocation = null  // Ubicación personalizada
    } = reservationData;

    // Construir fechas/horas para el evento
    const eventDate = new Date(date);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Crear objetos Date para inicio y fin en zona horaria de Ecuador (UTC-5)
    // 🎯 IMPORTANTE: Google Calendar espera ISO strings en UTC, pero debemos
    // especificar explícitamente el offset -05:00 para Ecuador
    const dateStr = date; // formato: "2025-11-13"
    
    // Construir ISO strings CON el offset de Ecuador (-05:00)
    // Ejemplo: "2025-11-13T15:00:00-05:00" = 3pm Ecuador = 8pm UTC
    const startDateTimeStr = `${dateStr}T${startTime}:00-05:00`;
    const endDateTimeStr = `${dateStr}T${endTime}:00-05:00`;
    
    const startDateTime = new Date(startDateTimeStr);
    const endDateTime = new Date(endDateTimeStr);

    console.log('[CALENDAR] 🔧 DEBUG Timezone Ecuador:');
    console.log(`  - Input: ${dateStr} ${startTime} (Ecuador UTC-5)`);
    console.log(`  - Start con offset: ${startDateTimeStr}`);
    console.log(`  - Start ISO (UTC): ${startDateTime.toISOString()}`);
    console.log(`  - End ISO (UTC): ${endDateTime.toISOString()}`);

    // 🎯 Formato del título con nombres correctos de servicios
    const guestCount = reservationData.guestCount || 0;
    const guestSuffix = guestCount > 0 ? ` +${guestCount}` : '';
    
    // Convertir serviceType a nombres legibles
    const serviceNames = {
      'hotDesk': 'Hot Desk',
      'meetingRoom': 'Sala de Reuniones',
      'privateOffice': 'Oficina Privada'
    };
    
    const serviceName = serviceNames[serviceType] || serviceType;
    
    // 🔢 Agregar número de Hot Desk al título si está disponible
    const hotDeskNumber = reservationData.hotDeskNumber;
    const hotDeskSuffix = (serviceType === 'hotDesk' || serviceType === 'Hot Desk') && hotDeskNumber 
      ? ` ${hotDeskNumber}/6` 
      : '';
    
    const eventTitle = `${serviceName}${hotDeskSuffix} ${userName}${guestSuffix}`;
    
    // 💳 Formato de método de pago
    const paymentMethod = reservationData.paymentMethod;
    const paymentDisplay = paymentMethod
      ? {
          'tarjeta': 'Tarjeta Online',
          'transferencia': 'Transferencia Online',
          'efectivo': 'Efectivo Presencial'
        }[paymentMethod] || 'Pendiente'
      : 'Pendiente';
    
    // Definir el evento (Google generará ID automáticamente)
    const wasFree = !price || price === 0;
    const reservationType = wasFree ? '🎁 GRATIS (Primera visita)' : `💳 PAGADA - ${paymentDisplay}`;
    
    // Usar descripción personalizada si existe, sino generar la default
    const eventDescription = customDescription || `
🎯 Reserva confirmada en Coworkia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${reservationType}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Cliente: ${userName}
📧 Email: ${email}
🏢 Espacio: ${serviceName}${hotDeskSuffix}
👥 Personas: ${1 + guestCount} (cliente + ${guestCount} acompañantes)
⏱️ Duración: ${duration || '2 horas'}
💰 Monto: ${wasFree ? 'Sin costo' : `$${price} USD`}

📅 Fecha: ${date}
🕐 Horario: ${startTime} - ${endTime}

📍 Ubicación: Whymper 403, Edificio Finistere, Quito
🗺️ Google Maps: https://maps.app.goo.gl/Nqy6YeGuxo3czEt66
📞 Contacto: +593 99 483 7117

¡Te esperamos! 🚀
    `.trim();
    
    const event = {
      summary: eventTitle, // Ejemplo: "Hot Desk 3/6 Diego Villota +2"
      description: eventDescription,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Guayaquil' // Google Calendar ajustará automáticamente
      },
      end: {
        dateTime: endDateTime.toISOString(), 
        timeZone: 'America/Guayaquil' // Google Calendar ajustará automáticamente
      },
      location: customLocation || 'Whymper 403, Edificio Finistere, Quito, Ecuador',
      // NOTA: Service Accounts no pueden invitar attendees sin Domain-Wide Delegation
      // Solo creamos el evento como referencia. Las notificaciones van por email separado.
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 }        // 1 hora antes
        ]
      },
      colorId: colorId, // Personalizable por tipo de evento
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
    const response = await runWithRetry('google-calendar:insert', () => calendar.events.insert({
      calendarId,
      resource: event,
      sendUpdates: 'none'
    }), {
      maxRetries: 2,
      backoffBaseMs: 600,
      circuitId: 'google-calendar-insert'
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
