/**
 * 🔍 AUDITORÍA DE NÚMEROS DE PRUEBA
 * 
 * Extrae y analiza todas las interacciones de los números de testing:
 * - 0788: +593987770788
 * - 0262: +593992320262
 */

import databaseService from '../../src/database/database.js';

const TEST_NUMBERS = {
  '0788': '+593987770788',
  '0262': '+593992320262'
};

console.log('🔍 AUDITORÍA DE NÚMEROS DE PRUEBA\n');
console.log('=' .repeat(80));

async function auditTestNumbers() {
  try {
    await databaseService.initialize();
    
    for (const [label, phoneNumber] of Object.entries(TEST_NUMBERS)) {
      console.log(`\n\n📱 NÚMERO ${label} (${phoneNumber})`);
      console.log('=' .repeat(80));
      
      // 1. Perfil del usuario
      const user = await databaseService.get(
        'SELECT * FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      if (!user) {
        console.log('❌ Usuario NO registrado en base de datos');
        continue;
      }
      
      console.log('\n👤 PERFIL:');
      console.log(`   Nombre: ${user.name || 'Sin nombre'}`);
      console.log(`   Agente activo: ${user.active_agent || 'AURORA'}`);
      console.log(`   Idioma: ${user.preferred_language || 'es'}`);
      console.log(`   Trial usado: ${user.free_trial_used ? 'SÍ' : 'NO'}`);
      console.log(`   Última actividad: ${user.last_interaction || 'Nunca'}`);
      
      // 2. Interacciones recientes (últimas 10)
      const interactions = await databaseService.all(
        `SELECT 
          timestamp,
          agent,
          intent_reason,
          input,
          output
         FROM interactions 
         WHERE user_phone = ? 
         ORDER BY timestamp DESC 
         LIMIT 10`,
        [phoneNumber]
      );
      
      console.log(`\n💬 INTERACCIONES RECIENTES (${interactions.length}):`);
      console.log('-'.repeat(80));
      
      if (interactions.length === 0) {
        console.log('   ⚠️  Sin interacciones registradas');
      } else {
        interactions.reverse().forEach((int, idx) => {
          const timestamp = new Date(int.timestamp).toISOString().replace('T', ' ').slice(0, 19);
          console.log(`\n   ${idx + 1}. [${timestamp}] ${int.agent}`);
          console.log(`      Razón: ${int.intent_reason}`);
          console.log(`      👤 Usuario: "${int.input?.substring(0, 60)}${int.input?.length > 60 ? '...' : ''}"`);
          console.log(`      🤖 Bot: "${int.output?.substring(0, 60)}${int.output?.length > 60 ? '...' : ''}"`);
        });
      }
      
      // 3. Reservas
      const reservations = await databaseService.all(
        `SELECT * FROM reservations WHERE user_phone = ? ORDER BY created_at DESC LIMIT 5`,
        [phoneNumber]
      );
      
      console.log(`\n\n📅 RESERVAS (${reservations.length}):`);
      console.log('-'.repeat(80));
      
      if (reservations.length === 0) {
        console.log('   ⚠️  Sin reservas registradas');
      } else {
        reservations.forEach((res, idx) => {
          console.log(`\n   ${idx + 1}. ${res.date} ${res.start_time || 'Sin hora'}`);
          console.log(`      Tipo: ${res.service_type}`);
          console.log(`      Estado: ${res.status}`);
          console.log(`      Precio: ${res.was_free ? 'GRATIS' : `$${res.price || 0}`}`);
          console.log(`      Email: ${res.email || 'Sin email'}`);
        });
      }
      
      // 4. Confirmaciones pendientes
      const pending = await databaseService.all(
        `SELECT * FROM pending_confirmations WHERE user_id = ?`,
        [phoneNumber]
      );
      
      console.log(`\n\n⏳ CONFIRMACIONES PENDIENTES (${pending.length}):`);
      console.log('-'.repeat(80));
      
      if (pending.length === 0) {
        console.log('   ✅ Sin confirmaciones pendientes');
      } else {
        pending.forEach((p, idx) => {
          console.log(`\n   ${idx + 1}. Tipo: ${p.reservation_type}`);
          console.log(`      Agente: ${p.agent_type}`);
          console.log(`      Data: ${JSON.stringify(p.data).substring(0, 100)}...`);
        });
      }
    }
    
    // Resumen general
    console.log('\n\n\n' + '='.repeat(80));
    console.log('📊 RESUMEN GENERAL');
    console.log('='.repeat(80));
    
    for (const [label, phoneNumber] of Object.entries(TEST_NUMBERS)) {
      const user = await databaseService.get(
        'SELECT COUNT(*) as total FROM interactions WHERE user_phone = ?',
        [phoneNumber]
      );
      
      const reservations = await databaseService.get(
        'SELECT COUNT(*) as total FROM reservations WHERE user_phone = ?',
        [phoneNumber]
      );
      
      console.log(`\n${label} (${phoneNumber}):`);
      console.log(`   Interacciones totales: ${user.total}`);
      console.log(`   Reservas totales: ${reservations.total}`);
    }
    
    console.log('\n✅ Auditoría completada\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    process.exit(1);
  }
}

auditTestNumbers();
