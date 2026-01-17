// scripts/testing/limpiar-calendar-directo.js
// Lista y limpia TODOS los eventos de Google Calendar para fechas de prueba

import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';

// Configurar Google Calendar con service account desde env
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON no configurado');
  process.exit(1);
}

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// Asegurar formato correcto de private_key
let privateKey = credentials.private_key;
if (privateKey && !privateKey.includes('\\n')) {
  privateKey = privateKey;
} else if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const jwtClient = new google.auth.JWT({
  email: credentials.client_email,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth: jwtClient });
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

async function main() {
  console.log('🔍 ESCANEANDO GOOGLE CALENDAR...\n');
  
  try {
    // Autorizar cliente
    await jwtClient.authorize();
    console.log('✅ Cliente autorizado\n');
    
    // Listar TODOS los eventos del 19 y 20 de enero 2026
    const lunes = new Date('2026-01-19T00:00:00-05:00');
    const martes = new Date('2026-01-20T23:59:59-05:00');
    
    console.log('📅 Buscando eventos entre:');
    console.log(`   Desde: ${lunes.toISOString()}`);
    console.log(`   Hasta: ${martes.toISOString()}\n`);
    
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: lunes.toISOString(),
      timeMax: martes.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const eventos = response.data.items || [];
    console.log(`📊 Total eventos encontrados: ${eventos.length}\n`);
    
    if (eventos.length === 0) {
      console.log('✅ No hay eventos para limpiar');
      process.exit(0);
    }
    
    // Categorizar eventos
    const hotDesks9am = eventos.filter(e => 
      e.summary?.includes('Hot Desk') && 
      e.start?.dateTime?.includes('09:00')
    );
    
    const hotDesksOtros = eventos.filter(e => 
      e.summary?.includes('Hot Desk') && 
      !e.start?.dateTime?.includes('09:00')
    );
    
    const salas = eventos.filter(e => 
      e.summary?.includes('Sala Reuniones')
    );
    
    const otros = eventos.filter(e => 
      !e.summary?.includes('Hot Desk') && 
      !e.summary?.includes('Sala Reuniones')
    );
    
    console.log('📋 CATEGORIZACIÓN:\n');
    console.log(`   🟢 Hot Desks 9-11 AM: ${hotDesks9am.length} eventos`);
    console.log(`   🔵 Hot Desks otros horarios: ${hotDesksOtros.length} eventos`);
    console.log(`   🟣 Salas de Reuniones: ${salas.length} eventos`);
    console.log(`   ⚪ Otros eventos: ${otros.length} eventos\n`);
    
    // Separar por día los Hot Desks 9 AM
    const lunes19 = hotDesks9am.filter(e => 
      e.start?.dateTime?.includes('2026-01-19')
    );
    const martes20 = hotDesks9am.filter(e => 
      e.start?.dateTime?.includes('2026-01-20')
    );
    
    console.log('📅 HOT DESKS 9-11 AM POR DÍA:\n');
    console.log(`   Lunes 19 enero: ${lunes19.length} eventos`);
    lunes19.forEach((e, i) => {
      console.log(`      ${i+1}. ${e.summary} - ID: ${e.id}`);
    });
    
    console.log(`\n   Martes 20 enero: ${martes20.length} eventos`);
    martes20.forEach((e, i) => {
      console.log(`      ${i+1}. ${e.summary} - ID: ${e.id}`);
    });
    
    // Mantener solo los primeros 6 de cada día
    const mantenerLunes = lunes19.slice(0, 6);
    const mantenerMartes = martes20.slice(0, 6);
    
    const eliminarLunes = lunes19.slice(6);
    const eliminarMartes = martes20.slice(6);
    
    const todasEliminar = [...eliminarLunes, ...eliminarMartes];
    
    console.log('\n\n🗑️  EVENTOS A ELIMINAR:\n');
    console.log(`   Lunes 19: ${eliminarLunes.length} eventos extras`);
    console.log(`   Martes 20: ${eliminarMartes.length} eventos extras`);
    console.log(`   Total a eliminar: ${todasEliminar.length}\n`);
    
    if (todasEliminar.length === 0) {
      console.log('✅ No hay eventos extras para eliminar');
      console.log('📊 Calendar ya tiene exactamente 6 eventos por día');
      process.exit(0);
    }
    
    console.log('🚀 INICIANDO ELIMINACIÓN...\n');
    
    let exitosos = 0;
    let errores = 0;
    
    for (const evento of todasEliminar) {
      try {
        const fecha = evento.start?.dateTime?.split('T')[0];
        console.log(`🗑️  ${fecha} - ${evento.summary}`);
        console.log(`   ID: ${evento.id}`);
        
        await calendar.events.delete({
          calendarId: CALENDAR_ID,
          eventId: evento.id
        });
        
        console.log(`   ✅ Eliminado\n`);
        exitosos++;
        
        // Pausa para no saturar API
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errores++;
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 RESUMEN:');
    console.log(`   ✅ Eventos eliminados: ${exitosos}`);
    if (errores > 0) {
      console.log(`   ❌ Errores: ${errores}`);
    }
    console.log(`   📅 Eventos restantes: 6 Hot Desks por día (9-11 AM)`);
    console.log(`   🟣 Salas Reuniones: ${salas.length} eventos (sin modificar)\n`);
    
    console.log('🔗 Verificar en:');
    console.log('   https://calendar.google.com\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
