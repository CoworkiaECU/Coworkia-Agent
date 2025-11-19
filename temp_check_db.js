import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    // Buscar usuario Diego Villota
    const userQuery = `
      SELECT phone_number, name, email, first_visit, free_trial_used, 
             free_trial_date, conversation_count, created_at, updated_at
      FROM users 
      WHERE name ILIKE '%diego%' OR email ILIKE '%diego%'
      ORDER BY updated_at DESC
      LIMIT 3
    `;
    
    console.log('🔍 Buscando usuarios Diego en PostgreSQL...\n');
    const users = await pool.query(userQuery);
    
    if (users.rows.length === 0) {
      console.log('❌ No se encontró usuario Diego Villota');
    } else {
      console.log(`✅ Encontrados ${users.rows.length} usuarios:\n`);
      users.rows.forEach((user, i) => {
        console.log(`Usuario ${i + 1}:`);
        console.log(`  📱 Phone: ${user.phone_number}`);
        console.log(`  👤 Name: ${user.name}`);
        console.log(`  📧 Email: ${user.email || 'N/A'}`);
        console.log(`  🆕 First Visit: ${user.first_visit}`);
        console.log(`  🎉 Free Trial Used: ${user.free_trial_used}`);
        console.log(`  📅 Free Trial Date: ${user.free_trial_date || 'N/A'}`);
        console.log(`  💬 Conversation Count: ${user.conversation_count}`);
        console.log(`  🕐 Created: ${user.created_at}`);
        console.log(`  🕐 Updated: ${user.updated_at}\n`);
      });
      
      // Buscar reservas del primer usuario
      const firstPhone = users.rows[0].phone_number;
      const reservationsQuery = `
        SELECT id, service_type, date, start_time, end_time, 
               was_free, status, payment_status, created_at
        FROM reservations 
        WHERE user_phone = $1
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      console.log(`\n📋 Reservas de ${users.rows[0].name}:\n`);
      const reservations = await pool.query(reservationsQuery, [firstPhone]);
      
      if (reservations.rows.length === 0) {
        console.log('  ❌ Sin reservas registradas');
      } else {
        reservations.rows.forEach((res, i) => {
          console.log(`Reserva ${i + 1}:`);
          console.log(`  🆔 ID: ${res.id}`);
          console.log(`  🏢 Tipo: ${res.service_type}`);
          console.log(`  📅 Fecha: ${res.date} ${res.start_time}-${res.end_time}`);
          console.log(`  💰 Gratis: ${res.was_free}`);
          console.log(`  ✅ Estado: ${res.status} / Pago: ${res.payment_status}`);
          console.log(`  🕐 Creada: ${res.created_at}\n`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
