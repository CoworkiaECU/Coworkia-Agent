// scripts/testing/limpiar-calendar-eventos.js
// Limpia eventos de prueba en Google Calendar

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conectar a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Configurar Google Calendar
const CREDENTIALS_PATH = path.join(__dirname, '../../coworkia-calendar-credentials.json');
const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

async function main() {
  console.log('🧹 LIMPIANDO EVENTOS DE GOOGLE CALENDAR\n');
  
  try {
    // 1. Obtener reservas con calendar_event_id para los días de prueba
    const query = await pool.query(
      `SELECT id, calendar_event_id, date, start_time, user_phone, hot_desk_number 
       FROM reservations 
       WHERE date IN ('2026-01-19', '2026-01-20') 
       AND start_time = '09:00' 
       AND service_type = 'hotDesk'
       AND calendar_event_id IS NOT NULL
       ORDER BY date, hot_desk_number`,
      []
    );
    
    const reservas = query.rows;
    console.log(`📊 Encontradas ${reservas.length} reservas con eventos en Calendar\n`);
    
    if (reservas.length === 0) {
      console.log('✅ No hay eventos para limpiar');
      await pool.end();
      process.exit(0);
    }
    
    // Debug: mostrar todas las reservas
    console.log('📋 Reservas encontradas:');
    reservas.forEach(r => {
      console.log(`   ${r.date} - Hot Desk #${r.hot_desk_number} - ${r.calendar_event_id}`);
    });
    console.log('');
    
    // 2. Mantener solo las primeras 6 de cada día
    const lunes = reservas.filter(r => {
      const fecha = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
      return fecha === '2026-01-19';
    });
    const martes = reservas.filter(r => {
      const fecha = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
      return fecha === '2026-01-20';
    });
    
    const mantenerLunes = lunes.slice(0, 6);
    const mantenerMartes = martes.slice(0, 6);
    const mantener = [...mantenerLunes, ...mantenerMartes];
    
    const eliminarLunes = lunes.slice(6);
    const eliminarMartes = martes.slice(6);
    const eliminar = [...eliminarLunes, ...eliminarMartes];
    
    console.log(`📋 Lunes 19 enero:`);
    console.log(`   Mantener: ${mantenerLunes.length} eventos (Hot Desks 1-6)`);
    console.log(`   Eliminar: ${eliminarLunes.length} eventos extras\n`);
    
    console.log(`📋 Martes 20 enero:`);
    console.log(`   Mantener: ${mantenerMartes.length} eventos (Hot Desks 1-6)`);
    console.log(`   Eliminar: ${eliminarMartes.length} eventos extras\n`);
    
    if (eliminar.length === 0) {
      console.log('✅ No hay eventos extras para eliminar');
      await pool.end();
      process.exit(0);
    }
    
    console.log(`🗑️  Eliminando ${eliminar.length} eventos de Google Calendar...\n`);
    
    // 3. Eliminar eventos de Calendar
    let exitosos = 0;
    let errores = 0;
    
    for (const reserva of eliminar) {
      try {
        console.log(`🗑️  ${reserva.date} - Hot Desk #${reserva.hot_desk_number}`);
        console.log(`   Event ID: ${reserva.calendar_event_id}`);
        
        await calendar.events.delete({
          calendarId: CALENDAR_ID,
          eventId: reserva.calendar_event_id
        });
        
        console.log(`   ✅ Evento eliminado de Calendar\n`);
        exitosos++;
        
        // Pequeña pausa para no saturar API
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errores++;
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ LIMPIEZA DE CALENDAR COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`📊 RESUMEN:`);
    console.log(`   ✅ Eventos eliminados exitosamente: ${exitosos}`);
    if (errores > 0) {
      console.log(`   ❌ Errores: ${errores}`);
    }
    console.log(`   📅 Eventos restantes por día: 6 (Hot Desks 1-6)\n`);
    
    console.log('🔗 Verificar en:');
    console.log('   https://calendar.google.com\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

main();
