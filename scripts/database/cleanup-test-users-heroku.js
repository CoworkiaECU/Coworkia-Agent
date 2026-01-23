/**
 * 🧹 LIMPIEZA DE USUARIOS DE TEST - HEROKU DYNO
 * Este script SE EJECUTA EN HEROKU con acceso directo a DATABASE_URL
 */

import pg from 'pg';

const TEST_USERS = [
  '+593990650788',  // Diego - Personal
  '+593990650262'   // Coworkia - Empresa
];

async function cleanupTestUsers() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🧹 Limpiando usuarios de test en Heroku PostgreSQL...\n');

    for (const phone of TEST_USERS) {
      console.log(`📱 Limpiando: ${phone}`);
      console.log('─'.repeat(50));

      // 1. Eliminar archivos
      const files = await client.query(
        'DELETE FROM conversation_files WHERE user_phone = $1',
        [phone]
      );
      console.log(`  🗑️  Archivos: ${files.rowCount} eliminados`);

      // 2. Eliminar temas activos
      const topics = await client.query(
        'DELETE FROM active_topics WHERE user_phone = $1',
        [phone]
      );
      console.log(`  🗑️  Temas activos: ${topics.rowCount} eliminados`);

      // 3. Eliminar conversaciones
      const conversations = await client.query(
        'DELETE FROM agent_conversations WHERE user_phone = $1',
        [phone]
      );
      console.log(`  🗑️  Conversaciones: ${conversations.rowCount} eliminadas`);

      // 4. Eliminar reservas
      const reservations = await client.query(
        'DELETE FROM reservations WHERE user_phone = $1',
        [phone]
      );
      console.log(`  🗑️  Reservas: ${reservations.rowCount} eliminadas`);

      // 5. Eliminar confirmaciones
      const confirmations = await client.query(
        'DELETE FROM pending_confirmations WHERE user_phone = $1',
        [phone]
      );
      console.log(`  🗑️  Confirmaciones: ${confirmations.rowCount} eliminadas`);

      // 6. Eliminar interacciones legacy
      const interactions = await client.query(
        'DELETE FROM interactions WHERE user_phone = $1',
        [phone]
      );
      console.log(`  🗑️  Interacciones: ${interactions.rowCount} eliminadas`);

      // 7. Resetear perfil
      const profile = await client.query(
        `UPDATE users 
         SET conversation_count = 0,
             active_agent = 'AURORA',
             active_agents = '{}',
             context_preferences = '{}',
             last_message_at = NULL,
             free_trial_used = false,
             free_trial_date = NULL
         WHERE phone_number = $1`,
        [phone]
      );
      console.log(`  ✅ Perfil reseteado: ${profile.rowCount} usuario(s)\n`);
    }

    // Verificar resultados
    console.log('═'.repeat(50));
    console.log('📊 VERIFICACIÓN DE RESULTADOS');
    console.log('═'.repeat(50) + '\n');

    const verification = await client.query(
      `SELECT phone_number, name, conversation_count, active_agent, free_trial_used
       FROM users 
       WHERE phone_number IN ($1, $2)`,
      TEST_USERS
    );

    console.log('👥 Usuarios reseteados:');
    verification.rows.forEach(row => {
      console.log(`\n  📱 ${row.phone_number}`);
      console.log(`     Nombre: ${row.name || 'Sin nombre'}`);
      console.log(`     Conversaciones: ${row.conversation_count}`);
      console.log(`     Agente activo: ${row.active_agent}`);
      console.log(`     Primera visita usada: ${row.free_trial_used}`);
    });

    const convCount = await client.query(
      'SELECT COUNT(*) FROM agent_conversations WHERE user_phone IN ($1, $2)',
      TEST_USERS
    );
    console.log(`\n💬 Conversaciones restantes: ${convCount.rows[0].count}`);

    const resCount = await client.query(
      'SELECT COUNT(*) FROM reservations WHERE user_phone IN ($1, $2)',
      TEST_USERS
    );
    console.log(`📅 Reservas restantes: ${resCount.rows[0].count}`);

    console.log('\n' + '═'.repeat(50));
    console.log('✅ LIMPIEZA COMPLETADA EXITOSAMENTE');
    console.log('═'.repeat(50));
    console.log('\n🎯 Los usuarios están como nuevos para pruebas\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

cleanupTestUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
