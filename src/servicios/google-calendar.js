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
      location: customLocation = null,  // Ubicación personalizada
      wifiCode = null,             // Código WiFi generado para la sesión
      reservationId = null         // Número de reserva (RES-WHY-XXXX)
    } = reservationData;

    // 🚨 VALIDACIÓN: Verificar datos requeridos
    if (!date || !startTime || !endTime) {
      console.error('[CALENDAR] ❌ Datos incompletos:', { date, startTime, endTime });
      return {
        success: false,
        error: `Datos incompletos para crear evento: date=${date}, startTime=${startTime}, endTime=${endTime}`
      };
    }

    // Construir fechas/horas para el evento
    const eventDate = new Date(date);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Crear objetos Date para inicio y fin en zona horaria de Ecuador (UTC-5)
    // 🎯 IMPORTANTE: Google Calendar espera ISO strings en UTC, pero debemos
    // especificar explícitamente el offset -05:00 para Ecuador
    
    // 🔧 FIX: Convertir date a string si viene como Date object
    let dateStr;
    if (date instanceof Date) {
      // Si es Date object, convertir a formato YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
      console.log('[CALENDAR] 🔄 Date object convertido a string:', dateStr);
    } else {
      // Si ya es string, usarlo directamente
      dateStr = date; // formato: "2025-11-13"
    }
    
    // Construir ISO strings CON el offset de Ecuador (-05:00)
    // Ejemplo: "2025-11-13T15:00:00-05:00" = 3pm Ecuador = 8pm UTC
    const startDateTimeStr = `${dateStr}T${startTime}:00-05:00`;
    const endDateTimeStr = `${dateStr}T${endTime}:00-05:00`;
    
    const startDateTime = new Date(startDateTimeStr);
    const endDateTime = new Date(endDateTimeStr);

    if (process.env.DEBUG_MODE === 'true') {
      console.log('[CALENDAR] 🔧 DEBUG Timezone Ecuador:');
      console.log(`  - Input: ${dateStr} ${startTime} (Ecuador UTC-5)`);
      console.log(`  - Start con offset: ${startDateTimeStr}`);
      console.log(`  - Start ISO (UTC): ${startDateTime.toISOString()}`);
      console.log(`  - End ISO (UTC): ${endDateTime.toISOString()}`);
    }

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
      ? ` ${hotDeskNumber}/4` 
      : '';
    
    const eventTitle = `${serviceName}${hotDeskSuffix} ${userName}${guestSuffix}`;
    
    // 💳 Formato de método de pago y estado de la reserva
    const paymentMethod = reservationData.paymentMethod;
    const wasFree = !price || price === 0;
    
    // 🎯 LÓGICA MEJORADA: Determinar el estado real de la reserva
    let reservationType;
    
    if (wasFree) {
      // Es gratis (primera visita)
      reservationType = '🎁 GRATIS (Primera visita)';
    } else if (paymentMethod) {
      // Tiene método de pago confirmado
      const paymentDisplay = {
        'tarjeta': 'Tarjeta Online',
        'transferencia': 'Transferencia Online', 
        'efectivo': 'Efectivo Presencial'
      }[paymentMethod] || paymentMethod;
      reservationType = `✅ CONFIRMADA - ${paymentDisplay}`;
    } else {
      // No tiene método de pago aún (pendiente)
      reservationType = '⏳ PENDIENTE DE PAGO';
    }
    
    // Definir el evento (Google generará ID automáticamente)

    // Descripción compacta: estado · cliente · espacio · código reserva · WiFi
    const guestLine   = guestCount > 0 ? `\n👥 ${1 + guestCount} personas` : '';
    const reserveLine = reservationId ? `\n🔢 ${reservationId}` : '';
    const wifiLine    = wifiCode ? `\n🔑 WiFi: ${wifiCode}  (${duration || '2h'})` : '';
    const eventDescription = customDescription || [
      reservationType,
      '',
      `👤 ${userName}  ·  ✉️ ${email}`,
      `🏢 ${serviceName}${hotDeskSuffix}  ·  ⏱️ ${duration || '2 horas'}  ·  💰 ${wasFree ? 'Sin costo' : `$${price} USD`}`,
      `🗓️ ${dateStr}  ·  🕐 ${startTime} - ${endTime}${guestLine}${reserveLine}${wifiLine}`,
    ].join('\n');
    
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

    // 🎯 MULTI-CALENDARIO: Crear evento en calendario principal Y en coworkia.ec@gmail.com
    const primaryCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const secondaryCalendarId = 'coworkia.ec@gmail.com';
    
    console.log('[CALENDAR] 🔄 Creando evento en múltiples calendarios...');
    console.log(`[CALENDAR] 📅 Principal: ${primaryCalendarId}`);
    console.log(`[CALENDAR] 📅 Secundario: ${secondaryCalendarId}`);
    
    // Crear el evento en calendario principal (sin invitaciones - las notificaciones van por email)
    const primaryResponse = await runWithRetry('google-calendar:insert-primary', () => calendar.events.insert({
      calendarId: primaryCalendarId,
      resource: event,
      sendUpdates: 'none'
    }), {
      maxRetries: 2,
      backoffBaseMs: 600,
      circuitId: 'google-calendar-insert-primary'
    });

    console.log('[CALENDAR] ✅ Evento creado en calendario principal!');
    console.log(`[CALENDAR] 🔗 URL del evento: ${primaryResponse.data.htmlLink}`);
    console.log(`[CALENDAR] 📧 ID del evento: ${primaryResponse.data.id}`);
    
    // Intentar crear copia en calendario secundario (coworkia.ec@gmail.com)
    let secondaryEventId = null;
    let secondaryEventUrl = null;
    
    try {
      const secondaryResponse = await runWithRetry('google-calendar:insert-secondary', () => calendar.events.insert({
        calendarId: secondaryCalendarId,
        resource: event,
        sendUpdates: 'none'
      }), {
        maxRetries: 2,
        backoffBaseMs: 600,
        circuitId: 'google-calendar-insert-secondary'
      });
      
      secondaryEventId = secondaryResponse.data.id;
      secondaryEventUrl = secondaryResponse.data.htmlLink;
      
      console.log('[CALENDAR] ✅ Evento copiado a calendario secundario!');
      console.log(`[CALENDAR] 🔗 URL secundario: ${secondaryEventUrl}`);
      console.log(`[CALENDAR] 📧 ID secundario: ${secondaryEventId}`);
    } catch (secondaryError) {
      console.error('[CALENDAR] ⚠️ Error copiando a calendario secundario (continuando):', secondaryError.message);
      // No lanzar error - el evento principal ya está creado
    }

    return {
      success: true,
      eventId: primaryResponse.data.id,
      eventUrl: primaryResponse.data.htmlLink,
      secondaryEventId,
      secondaryEventUrl,
      message: secondaryEventId 
        ? 'Evento creado en ambos calendarios' 
        : 'Evento creado en calendario principal (secundario falló)'
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

/**
 * 🗑️ Eliminar evento de Google Calendar
 */
export async function deleteCalendarEvent(eventId) {
  console.log(`[CALENDAR] 🗑️  Eliminando evento: ${eventId}`);
  
  const calendar = await createCalendarClient();
  if (!calendar) {
    console.error('[CALENDAR] ❌ No se pudo crear cliente de calendario');
    return {
      success: false,
      error: 'Cliente de Google Calendar no disponible'
    };
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  try {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId
    });

    console.log(`[CALENDAR] ✅ Evento eliminado: ${eventId}`);
    return {
      success: true,
      message: 'Evento eliminado de Google Calendar'
    };
    
  } catch (error) {
    console.error(`[CALENDAR] ❌ Error eliminando evento ${eventId}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📅 Bloquear días de membresía en el calendario de Coworkia
 * Crea N eventos "HOT DESK RESERVADO" distribuidos entre los días laborables del mes
 * Plan 10 → 11 días | Plan 20 → 22 días
 */
export async function blockMembershipCalendar({ clientName, membershipType, startDate, membershipCode, planKey }) {
  const normalizedPlan = (planKey || membershipType || '').toLowerCase().replace(/[\s-]/g, '');
  const planDays = normalizedPlan.includes('20') ? 22 : normalizedPlan.includes('10') ? 11 : 0;

  if (planDays === 0) {
    console.log('[CALENDAR] ℹ️ Plan sin días de bloqueo (no es plan10/plan20)');
    return { success: true, blocked: 0 };
  }

  const calendar = await createCalendarClient();
  if (!calendar) {
    console.error('[CALENDAR] ❌ No se pudo crear cliente para bloqueo de membresía');
    return { success: false, error: 'Cliente de calendario no disponible' };
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const baseDate = startDate ? new Date(startDate) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth(); // 0-indexed

  // Recolectar días laborables (lun–vie) del mes
  const workDays = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) workDays.push({ year, month: month + 1, day: d });
  }

  const planLabel = normalizedPlan.includes('20') ? 'Plan 20' : 'Plan 10';
  const summary = `HOT DESK RESERVADO — ${clientName} (${planLabel}) ${membershipCode}`;
  const daysToBlock = workDays.slice(0, planDays);
  let blocked = 0;

  for (const { year: y, month: m, day: d } of daysToBlock) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    try {
      await calendar.events.insert({
        calendarId,
        requestBody: {
          summary,
          start: { date: dateStr },
          end:   { date: dateStr },
          transparency: 'opaque',
          colorId: '2',
          description: `Membresía Coworkia — ${membershipCode}\nCliente: ${clientName}`
        }
      });
      blocked++;
    } catch (err) {
      console.warn(`[CALENDAR] ⚠️ No se pudo bloquear ${dateStr}:`, err.message);
    }
  }

  console.log(`[CALENDAR] ✅ ${blocked}/${daysToBlock.length} días bloqueados para ${clientName} (${planLabel})`);
  return { success: true, blocked, total: daysToBlock.length };
}

export default {
  createCalendarEvent,
  testCalendarConnection,
  deleteCalendarEvent,
  blockMembershipCalendar
};
