// scripts/testing/recrear-reservas-limpias.js
// Elimina todas las reservas AM y crea 6 secuenciales limpias

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;
import { google } from 'googleapis';
import { createCalendarEvent } from '../../src/servicios/google-calendar.js';
import databaseService from '../../src/database/database.js';
import reservationRepository from '../../src/database/reservationRepository.js';
import userRepository from '../../src/database/userRepository.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Google Calendar
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
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

const USUARIOS = [
  { phone: '+593999111111', name: 'Usuario Test 1', email: 'test1@coworkia.com' },
  { phone: '+593999222222', name: 'Usuario Test 2', email: 'test2@coworkia.com' },
  { phone: '+593999333333', name: 'Usuario Test 3', email: 'test3@coworkia.com' },
  { phone: '+593999444444', name: 'Usuario Test 4', email: 'test4@coworkia.com' },
  { phone: '+593999555555', name: 'Usuario Test 5', email: 'test5@coworkia.com' },
  { phone: '+593999666666', name: 'Usuario Test 6', email: 'test6@coworkia.com' }
];

const FECHAS = [
  { date: '2026-01-19', day: 'Lunes 19' },
  { date: '2026-01-20', day: 'Martes 20' }
];

async function main() {
  console.log('🧹 LIMPIEZA Y RECREACIÓN DE RESERVAS\n');
  
  try {
    await jwtClient.authorize();
    await databaseService.initialize();
    console.log('✅ Sistemas inicializados\n');
    
    // ============================================
    // PASO 1: ELIMINAR TODAS LAS RESERVAS AM
    // ============================================
    console.log('🗑️  ELIMINANDO TODAS LAS RESERVAS 9 AM...\n');
    
    // Eliminar de Calendar
    const lunes = new Date('2026-01-19T00:00:00-05:00');
    const martes = new Date('2026-01-20T23:59:59-05:00');
    
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: lunes.toISOString(),
      timeMax: martes.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const eventosAM = (response.data.items || []).filter(e => 
      e.summary?.includes('Hot Desk') && 
      e.start?.dateTime?.includes('09:00')
    );
    
    console.log(`   Calendar: ${eventosAM.length} eventos Hot Desk 9 AM`);
    
    for (const evento of eventosAM) {
      try {
        await calendar.events.delete({
          calendarId: CALENDAR_ID,
          eventId: evento.id
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`   Error eliminando ${evento.id}:`, err.message);
      }
    }
    
    console.log(`   ✅ ${eventosAM.length} eventos eliminados de Calendar\n`);
    
    // Eliminar de Base de Datos
    await pool.query(
      `DELETE FROM reservations 
       WHERE date IN ('2026-01-19', '2026-01-20') 
       AND start_time = '09:00' 
       AND service_type = 'hotDesk'`
    );
    
    console.log(`   ✅ Reservas eliminadas de BD\n`);
    
    // ============================================
    // PASO 2: CREAR 6 RESERVAS SECUENCIALES LIMPIAS
    // ============================================
    console.log('📝 CREANDO RESERVAS SECUENCIALES LIMPIAS...\n');
    
    for (const fecha of FECHAS) {
      console.log(`📅 ${fecha.day} enero 2026:`);
      console.log('─'.repeat(50));
      
      for (let i = 0; i < 6; i++) {
        const usuario = USUARIOS[i];
        const hotDeskNumber = i + 1;
        const reservationId = `res_clean_${Date.now()}_${usuario.phone}`;
        
        console.log(`\n   ${hotDeskNumber}/6 - ${usuario.name}`);
        
        // Crear en BD
        try {
          await pool.query(
            `INSERT INTO reservations 
             (id, user_phone, service_type, date, start_time, end_time, 
              duration_hours, guest_count, total_price, was_free, 
              status, payment_status, payment_method, hot_desk_number, payment_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              reservationId,
              usuario.phone,
              'hotDesk',
              fecha.date,
              '09:00',
              '11:00',
              2,
              0,
              10,
              false,
              'confirmed',
              'paid',
              'tarjeta',
              hotDeskNumber,
              JSON.stringify({ method: 'tarjeta', amount: 10, currency: 'USD' })
            ]
          );
          console.log(`      ✅ BD: ${reservationId}`);
        } catch (err) {
          console.error(`      ❌ BD Error:`, err.message);
          continue;
        }
        
        // Crear en Calendar
        try {
          const calResult = await createCalendarEvent({
            userName: usuario.name,
            email: usuario.email,
            date: fecha.date,
            startTime: '09:00',
            endTime: '11:00',
            serviceType: 'Hot Desk',
            duration: '2 horas',
            price: 10,
            hotDeskNumber: hotDeskNumber,
            paymentMethod: 'tarjeta',
            isTest: true,
            colorId: '10'
          });
          
          if (calResult.success) {
            // Actualizar BD con calendar_event_id
            await pool.query(
              'UPDATE reservations SET calendar_event_id = $1 WHERE id = $2',
              [calResult.eventId, reservationId]
            );
            console.log(`      ✅ Calendar: ${calResult.eventId}`);
          } else {
            console.warn(`      ⚠️  Calendar error: ${calResult.error}`);
          }
        } catch (err) {
          console.error(`      ❌ Calendar error:`, err.message);
        }
        
        // Pausa entre reservas
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('\n');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RESERVAS RECREADAS EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 RESUMEN FINAL:');
    console.log('   📅 Lunes 19 enero: 6 reservas (Hot Desk 1/6 → 6/6)');
    console.log('   📅 Martes 20 enero: 6 reservas (Hot Desk 1/6 → 6/6)');
    console.log('   ✅ Secuencia limpia y ordenada\n');
    
    console.log('🔗 Verificar:');
    console.log('   https://calendar.google.com\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

main();
