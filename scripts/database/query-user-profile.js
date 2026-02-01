/**
 * Query User Profile - Consultar perfil completo de usuario
 * 
 * Uso: node scripts/database/query-user-profile.js <phone_number>
 * Ejemplo: node scripts/database/query-user-profile.js +593987770788
 */

import databaseService from '../../src/database/database.js';
import userRepository from '../../src/database/userRepository.js';
import reservationRepository from '../../src/database/reservationRepository.js';

async function queryUserProfile(phoneNumber) {
  try {
    await databaseService.initialize();
    console.log(`\n🔍 Consultando perfil de: ${phoneNumber}\n`);
    
    // Usuario
    const user = await userRepository.findByPhone(phoneNumber);
    
    if (!user) {
      console.log('❌ Usuario no encontrado en BD');
      return;
    }
    
    console.log('👤 USUARIO:');
    console.log('  Phone:', user.phone_number);
    console.log('  Active Agent:', user.active_agent || 'NULL');
    console.log('  Display Name:', user.whatsapp_display_name || 'NULL');
    console.log('  Preferred Language:', user.preferred_language || 'NULL');
    console.log('  Created:', user.created_at);
    console.log('  Updated:', user.updated_at);
    
    // Reservas recientes
    const reservations = await reservationRepository.findByUserPhone(phoneNumber);
    console.log('\n📅 RESERVAS RECIENTES:', reservations?.length || 0);
    if (reservations?.length > 0) {
      reservations.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.date} ${r.start_time}-${r.end_time} [${r.status}] ${r.resource_type || r.service_type}`);
      });
    }
    
    console.log('\n✅ Consulta completada\n');
    
  } catch (error) {
    console.error('❌ Error consultando perfil:', error);
  } finally {
    await databaseService.close();
  }
}

// Main
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('❌ Uso: node scripts/database/query-user-profile.js <phone_number>');
  console.error('   Ejemplo: node scripts/database/query-user-profile.js +593987770788');
  process.exit(1);
}

queryUserProfile(phoneNumber);
