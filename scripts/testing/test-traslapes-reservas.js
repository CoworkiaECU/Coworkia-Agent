/**
 * 🧪 SCRIPT DE PRUEBA: Traslapes de Reservas
 * 
 * Crea 6 reservas de Hot Desk simultáneas para testing:
 * - Lunes 19 enero 2026: 9:00-11:00 AM (6 hot desks ocupados)
 * - Martes 20 enero 2026: 9:00-11:00 AM (6 hot desks ocupados)
 * 
 * Objetivo: Probar que el usuario 7 es rechazado correctamente
 */

import dotenv from 'dotenv';
dotenv.config();

import databaseService from '../../src/database/database.js';
import reservationRepository from '../../src/database/reservationRepository.js';
import userRepository from '../../src/database/userRepository.js';
import { createCalendarEvent } from '../../src/servicios/google-calendar.js';

const USUARIOS_PRUEBA = [
  { phone: '+593999111111', name: 'Usuario Test 1', email: 'test1@coworkia.com' },
  { phone: '+593999222222', name: 'Usuario Test 2', email: 'test2@coworkia.com' },
  { phone: '+593999333333', name: 'Usuario Test 3', email: 'test3@coworkia.com' },
  { phone: '+593999444444', name: 'Usuario Test 4', email: 'test4@coworkia.com' },
  { phone: '+593999555555', name: 'Usuario Test 5', email: 'test5@coworkia.com' },
  { phone: '+593999666666', name: 'Usuario Test 6', email: 'test6@coworkia.com' },
  { phone: '+593999777777', name: 'Usuario Test 7', email: 'test7@coworkia.com' }
];

const FECHAS_PRUEBA = [
  { date: '2026-01-19', day: 'Lunes 19 enero' },
  { date: '2026-01-20', day: 'Martes 20 enero' }
];

/**
 * 🔨 Crear reserva de prueba
 */
async function crearReservaPrueba(userData, fecha, hotDeskNumber) {
  const reservationId = `res_test_${Date.now()}_${userData.phone}`;
  
  console.log(`\n📝 Creando reserva para ${userData.name} - Hot Desk ${hotDeskNumber}...`);
  
  // 1. Crear en base de datos
  const reservation = await reservationRepository.create({
    id: reservationId,
    user_phone: userData.phone,
    service_type: 'hotDesk',
    date: fecha.date,
    start_time: '09:00',
    end_time: '11:00',
    duration_hours: 2,
    guest_count: 0,
    total_price: 10,
    was_free: false,
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'tarjeta',
    hot_desk_number: hotDeskNumber,
    payment_data: JSON.stringify({
      method: 'tarjeta',
      amount: 10,
      currency: 'USD',
      timestamp: new Date().toISOString()
    })
  });
  
  console.log(`   ✅ Reserva creada en BD: ${reservation.id}`);
  
  // 2. Crear evento en Google Calendar
  try {
    const calendarResult = await createCalendarEvent({
      userName: userData.name,
      email: userData.email,
      date: fecha.date,
      startTime: '09:00',
      endTime: '11:00',
      serviceType: 'Hot Desk',
      duration: '2 horas',
      price: 10,
      hotDeskNumber: hotDeskNumber,
      paymentMethod: 'tarjeta',
      isTest: true,
      colorId: '10' // Verde para tests
    });
    
    if (calendarResult.success) {
      console.log(`   ✅ Evento en Calendar: ${calendarResult.eventUrl}`);
      
      // Actualizar reserva con calendar_event_id
      await reservationRepository.update(reservation.id, {
        calendar_event_id: calendarResult.eventId
      });
    } else {
      console.warn(`   ⚠️  Calendar falló: ${calendarResult.error}`);
    }
  } catch (calError) {
    console.error(`   ❌ Error Calendar: ${calError.message}`);
  }
  
  return reservation;
}

/**
 * 🚀 Ejecutar script de prueba
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST: TRASLAPES DE RESERVAS HOT DESK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Inicializar BD
    await databaseService.initialize();
    console.log('✅ Base de datos inicializada\n');
    
    // Crear usuarios de prueba si no existen
    console.log('👥 Creando usuarios de prueba...');
    for (const user of USUARIOS_PRUEBA) {
      try {
        await userRepository.createOrUpdate(user.phone, {
          name: user.name,
          email: user.email,
          whatsapp_display_name: user.name
        });
        console.log(`   ✅ ${user.name}`);
      } catch (e) {
        console.error(`   ❌ ${user.name}:`, e.message);
      }
    }
    console.log('');
    
    // Crear reservas para cada fecha
    for (const fecha of FECHAS_PRUEBA) {
      console.log(`\n📅 ${fecha.day} - 9:00-11:00 AM`);
      console.log('─'.repeat(50));
      
      for (let i = 0; i < USUARIOS_PRUEBA.length; i++) {
        await crearReservaPrueba(
          USUARIOS_PRUEBA[i],
          fecha,
          i + 1 // Hot Desk 1-6
        );
        
        // Pequeña pausa para no saturar
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // ============================================
    // CREAR RESERVAS DE SALA DE REUNIONES
    // ============================================
    console.log('\n\n🏢 CREANDO RESERVAS DE SALA DE REUNIONES');
    console.log('═'.repeat(50));
    
    const SALA_USUARIO = USUARIOS_PRUEBA[6]; // Usuario Test 7
    const GUEST_COUNT = 4; // Máximo permitido
    
    for (const fecha of FECHAS_PRUEBA) {
      console.log(`\n📅 ${fecha.day} - 4:00-6:00 PM`);
      console.log('─'.repeat(50) + '\n');
      
      const reservaId = `res_test_${Date.now()}_${SALA_USUARIO.phone}`;
      const reservaData = {
        id: reservaId,
        user_phone: SALA_USUARIO.phone,
        service_type: 'meetingRoom',
        date: fecha.date,
        start_time: '16:00',
        end_time: '18:00',
        duration_hours: 2,
        guest_count: GUEST_COUNT,
        total_price: 40, // $20/hora x 2 horas
        was_free: 0,
        status: 'confirmed',
        payment_status: 'paid',
        payment_data: JSON.stringify({
          method: 'tarjeta',
          amount: 40,
          currency: 'USD',
          timestamp: new Date().toISOString()
        }),
        hot_desk_number: null,
        payment_method: 'tarjeta',
        calendar_event_id: null
      };
      
      console.log(`📝 Creando reserva sala reuniones - ${GUEST_COUNT} personas...`);
      
      try {
        // Crear en BD
        const creada = await reservationRepository.create(reservaData);
        console.log(`   ✅ Reserva creada en BD: ${creada.id}`);
        
        // Crear evento en Google Calendar
        try {
          const calendarResult = await createCalendarEvent({
            userName: SALA_USUARIO.name,
            email: SALA_USUARIO.email,
            date: fecha.date,
            startTime: '16:00',
            endTime: '18:00',
            serviceType: 'Sala Reuniones',
            duration: '2 horas',
            price: 40,
            guestCount: GUEST_COUNT,
            paymentMethod: 'tarjeta',
            isTest: true,
            colorId: '9' // Azul para sala reuniones
          });
          
          if (calendarResult.success) {
            console.log(`   ✅ Evento en Calendar: ${calendarResult.eventUrl}`);
            await reservationRepository.update(creada.id, {
              calendar_event_id: calendarResult.eventId
            });
          } else {
            console.warn(`   ⚠️  Calendar falló: ${calendarResult.error}`);
          }
        } catch (calError) {
          console.error(`   ❌ Error Calendar: ${calError.message}`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
      // Pequeña pausa entre reservas
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PRUEBAS CREADAS EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const totalReservas = (USUARIOS_PRUEBA.length * FECHAS_PRUEBA.length) + FECHAS_PRUEBA.length;
    console.log('📊 RESUMEN:');
    console.log(`   • Total reservas creadas: ${totalReservas}`);
    console.log(`   • Hot Desks ocupados: ${USUARIOS_PRUEBA.length}/${USUARIOS_PRUEBA.length} (9-11 AM)`);
    console.log(`   • Sala Reuniones ocupada: ${FECHAS_PRUEBA.length}/${FECHAS_PRUEBA.length} (4-6 PM, 4 personas)`);
    console.log(`   • Fechas bloqueadas: ${FECHAS_PRUEBA.map(f => f.day).join(', ')}\n`);
    
    console.log('🎯 SIGUIENTE PASO:');
    console.log('   Intenta reservar un Hot Desk para:');
    console.log('   - Lunes 19 enero, 9:00 AM → Usuario debe ser RECHAZADO');
    console.log('   Intenta reservar Sala Reuniones para:');
    console.log('   - Lunes 19 enero, 4:00 PM → Usuario debe ser RECHAZADO\n');
    
    console.log('🔗 Ver calendario:');
    console.log('   https://calendar.google.com\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar
main();
