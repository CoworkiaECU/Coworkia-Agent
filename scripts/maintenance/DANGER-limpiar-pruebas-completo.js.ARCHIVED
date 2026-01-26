import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🧪 Números de prueba
const phones = [
  '+593987770788', // Diego
  '+593987770262'  // Prestado
];

async function limpiarAmbos() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 LIMPIEZA COMPLETA - PRUEBAS 0788 y 0262');
    console.log('═══════════════════════════════════════════════\n');
    
    for (const phone of phones) {
      console.log(`\n📱 Procesando: ${phone}`);
      console.log('─────────────────────────────────────────────');
      
      await client.query('BEGIN');
      
      // 1. pending_confirmations
      const r1 = await client.query('DELETE FROM pending_confirmations WHERE user_phone = $1', [phone]);
      console.log(`✅ Confirmaciones pendientes: ${r1.rowCount}`);
      
      // 2. reservation_state
      const r2 = await client.query('DELETE FROM reservation_state WHERE user_phone = $1', [phone]);
      console.log(`✅ Reservation state: ${r2.rowCount}`);
      
      // 3. reservations pendientes/canceladas
      const r3 = await client.query(
        `DELETE FROM reservations 
         WHERE user_phone = $1 
         AND status IN ($2, $3, $4, $5)`, 
        [phone, 'pending', 'pending_confirmation', 'pending_payment', 'cancelled']
      );
      console.log(`✅ Reservas pendientes/canceladas: ${r3.rowCount}`);
      
      // 4. partial_forms
      const r4 = await client.query('DELETE FROM partial_forms WHERE user_phone = $1', [phone]);
      console.log(`✅ Partial forms: ${r4.rowCount}`);
      
      // 5. aurora_partial_reservations
      const r5 = await client.query('DELETE FROM aurora_partial_reservations WHERE user_phone = $1', [phone]);
      console.log(`✅ Aurora partial: ${r5.rowCount}`);
      
      // 6. aluna_partial_memberships
      const r6 = await client.query('DELETE FROM aluna_partial_memberships WHERE user_phone = $1', [phone]);
      console.log(`✅ Aluna partial: ${r6.rowCount}`);
      
      // 7. Ver perfil actual
      const user = await client.query(
        'SELECT phone_number, whatsapp_display_name, name, email FROM users WHERE phone_number = $1', 
        [phone]
      );
      
      if (user.rows[0]) {
        console.log(`\n📋 Perfil actual:`);
        console.log(`   - WhatsApp Display Name: "${user.rows[0].whatsapp_display_name || 'NULL'}"`);
        console.log(`   - Name: "${user.rows[0].name || 'NULL'}"`);
        console.log(`   - Email: "${user.rows[0].email || 'NULL'}"`);
      } else {
        console.log(`\n⚠️  Usuario no existe en BD - se creará en próximo mensaje`);
      }
      
      // 8. RESETEAR whatsapp_display_name a NULL (forzar refresh)
      const r8 = await client.query(
        'UPDATE users SET whatsapp_display_name = NULL WHERE phone_number = $1', 
        [phone]
      );
      console.log(`\n✅ WhatsApp name reseteado a NULL: ${r8.rowCount}`);
      
      // 9. Limpiar historial conversación antiguo (mantener últimos 3 mensajes)
      const historyIds = await client.query(
        `SELECT id FROM conversation_history 
         WHERE user_phone = $1 
         ORDER BY timestamp DESC 
         LIMIT 3`,
        [phone]
      );
      
      const keepIds = historyIds.rows.map(r => r.id);
      let r9;
      if (keepIds.length > 0) {
        r9 = await client.query(
          `DELETE FROM conversation_history 
           WHERE user_phone = $1 
           AND id NOT IN (${keepIds.map((_, i) => `$${i + 2}`).join(',')})`,
          [phone, ...keepIds]
        );
      } else {
        r9 = { rowCount: 0 };
      }
      console.log(`✅ Historial antiguo limpiado: ${r9.rowCount}`);
      
      await client.query('COMMIT');
      console.log(`\n✅ LIMPIEZA COMPLETADA: ${phone}`);
    }
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ AMBOS NÚMEROS LIMPIADOS COMPLETAMENTE');
    console.log('\n📱 SIGUIENTE PASO:');
    console.log('   Cambia el nombre de usuario en WhatsApp');
    console.log('   Envía mensaje de prueba');
    console.log('   El bot detectará el nuevo nombre automáticamente\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

limpiarAmbos();
