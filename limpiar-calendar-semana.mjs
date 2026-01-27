// 🗓️ Limpieza de Google Calendar - TODA LA SEMANA
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

console.log('🗓️  LIMPIEZA DE GOOGLE CALENDAR - SEMANA\n');
console.log('═══════════════════════════════════════════════\n');

async function createCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  let privateKey = credentials.private_key;
  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  await jwtClient.authorize();
  return google.calendar({ version: 'v3', auth: jwtClient });
}

async function limpiarCalendarSemana() {
  const calendar = await createCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  
  // Lunes 26 enero al viernes 31 enero
  const inicio = new Date('2026-01-26T00:00:00-05:00');
  const fin = new Date('2026-02-01T00:00:00-05:00');
  
  console.log('📅 Buscando eventos de la semana (26-31 enero)...\n');
  
  // Listar eventos
  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: inicio.toISOString(),
    timeMax: fin.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });

  const eventos = response.data.items || [];
  console.log(`   Total encontrados: ${eventos.length}\n`);

  if (eventos.length === 0) {
    console.log('✅ No hay eventos para eliminar\n');
    process.exit(0);
  }

  // Mostrar eventos
  eventos.forEach((evento, i) => {
    const fecha = new Date(evento.start.dateTime || evento.start.date);
    console.log(`${i + 1}. ${evento.summary}`);
    console.log(`   Fecha: ${fecha.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`   Hora: ${fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`   ID: ${evento.id}\n`);
  });

  // Eliminar todos
  console.log('🗑️  Eliminando eventos...\n');
  let eliminados = 0;
  
  for (const evento of eventos) {
    try {
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: evento.id
      });
      console.log(`   ✅ Eliminado: ${evento.summary}`);
      eliminados++;
    } catch (error) {
      console.log(`   ❌ Error eliminando ${evento.summary}: ${error.message}`);
    }
  }

  console.log(`\n✅ ${eliminados}/${eventos.length} eventos eliminados de Google Calendar 🎯\n`);
  process.exit(0);
}

limpiarCalendarSemana();
