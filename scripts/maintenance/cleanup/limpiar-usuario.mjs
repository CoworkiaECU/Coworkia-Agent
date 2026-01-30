// 🧹 Script de limpieza completa de usuario
// Limpia todas las reservas pendientes, cache y fuerza refresh del nombre

import databaseService from './src/database/database.js';

const PHONE_NUMBERS = [
  '+593987770788',
  '593987770788',
  '0987770788'
];

console.log('🧹 LIMPIEZA COMPLETA DE USUARIOS\n');
console.log('═══════════════════════════════════════\n');

async function limpiarUsuario() {
  await databaseService.initialize();
  
  for (const phone of PHONE_NUMBERS) {
    console.log(`📱 Procesando: ${phone}\n`);
    
    // 1. Limpiar pending_confirmations
    console.log('1️⃣ Limpiando confirmaciones pendientes...');
    const conf = await databaseService.run(
      'DELETE FROM pending_confirmations WHERE user_phone = ?',
      [phone]
    );
    console.log(`   ✅ ${conf.changes || 0} confirmaciones eliminadas\n`);
    
    // 2. Limpiar reservation_state
    console.log('2️⃣ Limpiando reservation_state...');
    const resState = await databaseService.run(
      'DELETE FROM reservation_state WHERE user_phone = ?',
      [phone]
    );
    console.log(`   ✅ ${resState.changes || 0} estados eliminados\n`);
    
    // 3. Limpiar reservas pendientes
    console.log('3️⃣ Limpiando reservas pendientes/canceladas...');
    const res = await databaseService.run(
      `DELETE FROM reservations 
       WHERE user_phone = ? 
       AND status IN ('pending', 'pending_confirmation', 'pending_payment', 'cancelled')`,
      [phone]
    );
    console.log(`   ✅ ${res.changes || 0} reservas eliminadas\n`);
    
    // 4. Limpiar partial_forms (legacy)
    console.log('4️⃣ Limpiando formularios parciales (legacy)...');
    const partial = await databaseService.run(
      'DELETE FROM partial_forms WHERE user_phone = ?',
      [phone]
    );
    console.log(`   ✅ ${partial.changes || 0} formularios eliminados\n`);
    
    // 5. Limpiar aurora_partial_reservations
    console.log('5️⃣ Limpiando aurora_partial_reservations...');
    const aurora = await databaseService.run(
      'DELETE FROM aurora_partial_reservations WHERE user_phone = ?',
      [phone]
    );
    console.log(`   ✅ ${aurora.changes || 0} reservas parciales eliminadas\n`);
    
    // 6. Limpiar aluna_partial_memberships
    console.log('6️⃣ Limpiando aluna_partial_memberships...');
    const aluna = await databaseService.run(
      'DELETE FROM aluna_partial_memberships WHERE user_phone = ?',
      [phone]
    );
    console.log(`   ✅ ${aluna.changes || 0} membresías parciales eliminadas\n`);
    
    // 7. Verificar usuario en users
    console.log('7️⃣ Verificando perfil de usuario...');
    const user = await databaseService.get(
      'SELECT phone_number, whatsappDisplayName, email, name FROM users WHERE phone_number = ?',
      [phone]
    );
    
    if (user) {
      console.log(`   📋 Perfil actual:`);
      console.log(`      - Teléfono: ${user.phone_number}`);
      console.log(`      - WhatsApp Name: "${user.whatsappDisplayName || 'NULL'}"`);
      console.log(`      - Email: ${user.email || 'NULL'}`);
      console.log(`      - Name: ${user.name || 'NULL'}`);
      
      if (!user.whatsappDisplayName) {
        console.log(`   ⚠️  whatsappDisplayName está vacío - se actualizará en próximo mensaje`);
      } else {
        console.log(`   ✅ whatsappDisplayName configurado correctamente\n`);
      }
    } else {
      console.log(`   ⚠️  Usuario no encontrado en BD\n`);
    }
    
    // 8. Limpiar conversación vieja (opcional - mantener últimos 5 mensajes)
    console.log('8️⃣ Limpiando historial conversación antiguo...');
    const history = await databaseService.run(
      `DELETE FROM conversation_history 
       WHERE user_phone = ? 
       AND id NOT IN (
         SELECT id FROM conversation_history 
         WHERE user_phone = ? 
         ORDER BY timestamp DESC 
         LIMIT 5
       )`,
      [phone, phone]
    );
    console.log(`   ✅ ${history.changes || 0} mensajes antiguos eliminados\n`);
    
    console.log('─────────────────────────────────────\n');
  }
  
  console.log('═══════════════════════════════════════');
  console.log('✅ LIMPIEZA COMPLETADA\n');
  console.log('📱 SIGUIENTE PASO:');
  console.log('   Envía un mensaje desde WhatsApp');
  console.log('   El bot actualizará tu nombre automáticamente\n');
  
  process.exit(0);
}

limpiarUsuario().catch(error => {
  console.error('❌ ERROR:', error);
  process.exit(1);
});
