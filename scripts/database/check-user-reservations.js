/**
 * Script para ver reservas de un usuario específico
 */

import databaseService from '../src/database/database.js';
import reservationRepository from '../src/database/reservationRepository.js';
import userRepository from '../src/database/userRepository.js';

const USER_PHONE = '+593987770788'; // Diego Villota

async function checkUserReservations() {
  try {
    await databaseService.initialize();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Info del usuario
    console.log('👤 INFORMACIÓN DEL USUARIO');
    console.log('═'.repeat(60));
    const user = await userRepository.findByPhone(USER_PHONE);
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }

    console.log(`Nombre: ${user.name}`);
    console.log(`Email: ${user.email || 'No registrado'}`);
    console.log(`Primera visita: ${user.first_visit ? 'SÍ' : 'NO'}`);
    console.log(`Trial gratis usado: ${user.free_trial_used ? 'SÍ (' + user.free_trial_date + ')' : 'NO - DISPONIBLE'}`);
    console.log(`Conversaciones: ${user.conversation_count}`);
    
    // 2. Reservas del usuario
    console.log('\n📅 RESERVAS');
    console.log('═'.repeat(60));
    const reservations = await reservationRepository.findByUser(USER_PHONE);
    
    if (reservations.length === 0) {
      console.log('No tienes reservas registradas');
    } else {
      console.log(`Total de reservas: ${reservations.length}\n`);
      
      reservations.forEach((res, idx) => {
        const date = new Date(res.date);
        const dateStr = date.toLocaleDateString('es-EC', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        console.log(`${idx + 1}. ${dateStr}`);
        console.log(`   Horario: ${res.start_time} - ${res.end_time} (${res.duration_hours}h)`);
        console.log(`   Servicio: ${res.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones'}`);
        console.log(`   Estado: ${res.status} | Pago: ${res.payment_status}`);
        console.log(`   Precio: $${res.total_price} ${res.was_free ? '(GRATIS - primera visita)' : ''}`);
        console.log(`   ID: ${res.id}`);
        console.log(`   Creada: ${new Date(res.created_at).toLocaleString('es-EC')}`);
        console.log('');
      });
    }

    // 3. Próxima reserva
    const activeReservations = reservations.filter(r => 
      r.status === 'confirmed' || r.status === 'pending_payment'
    );

    if (activeReservations.length > 0) {
      console.log('🔔 PRÓXIMAS RESERVAS ACTIVAS:');
      console.log('═'.repeat(60));
      
      activeReservations.forEach(res => {
        const date = new Date(res.date);
        const dateStr = date.toLocaleDateString('es-EC', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        console.log(`📅 ${dateStr} | ${res.start_time} - ${res.end_time}`);
        console.log(`   💰 Precio: $${res.total_price} ${res.was_free ? '¡GRATIS!' : ''}`);
        console.log(`   🔖 Estado pago: ${res.payment_status}`);
        console.log('');
      });
    }

    // 4. Siguiente reserva cobrará?
    console.log('\n💰 PRÓXIMA RESERVA:');
    console.log('═'.repeat(60));
    
    if (user.free_trial_used) {
      console.log('⚠️  Tu próxima reserva TENDRÁ COSTO');
      console.log('');
      console.log('💵 PRECIOS:');
      console.log('   • Hot Desk (2h): $10.00');
      console.log('   • + IVA (15%): $1.50');
      console.log('   • + Comisión tarjeta (5%): $0.58');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   📱 Total con tarjeta: $12.08 USD');
      console.log('   🏦 Total transferencia: $11.50 USD (sin comisión)');
    } else {
      console.log('🎉 ¡Tu PRÓXIMA reserva será GRATIS!');
      console.log('   Es tu primera visita, tienes derecho a 2 horas gratis');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

checkUserReservations();
