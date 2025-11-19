/**
 * 🔧 Script para corregir datos corruptos en la base de datos
 * 
 * PROBLEMA DETECTADO:
 * - Usuarios con first_visit=false PERO sin reservas
 * - Esto causa que Aurora los trate como "clientes recurrentes" incorrectamente
 * 
 * SOLUCIÓN:
 * - Si usuario tiene 0 reservas → first_visit=true, free_trial_used=false
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixCorruptData() {
  try {
    console.log('🔍 Buscando usuarios con datos inconsistentes...\n');
    
    // Buscar todos los usuarios
    const usersQuery = `
      SELECT u.phone_number, u.name, u.first_visit, u.free_trial_used,
             COUNT(r.id) as reservation_count
      FROM users u
      LEFT JOIN reservations r ON u.phone_number = r.user_phone
      GROUP BY u.phone_number, u.name, u.first_visit, u.free_trial_used
      ORDER BY u.updated_at DESC
    `;
    
    const result = await pool.query(usersQuery);
    console.log(`📊 Total usuarios: ${result.rows.length}\n`);
    
    let corruptedCount = 0;
    const corruptedUsers = [];
    
    result.rows.forEach(user => {
      const hasReservations = user.reservation_count > 0;
      const markedAsNotFirst = user.first_visit === false;
      
      // INCONSISTENCIA: Usuario marcado como "no es primera vez" pero sin reservas
      if (markedAsNotFirst && !hasReservations) {
        corruptedCount++;
        corruptedUsers.push(user);
        console.log(`❌ DATOS CORRUPTOS encontrados:`);
        console.log(`   Phone: ${user.phone_number}`);
        console.log(`   Name: ${user.name || 'Sin nombre'}`);
        console.log(`   first_visit: ${user.first_visit} (debería ser true)`);
        console.log(`   free_trial_used: ${user.free_trial_used}`);
        console.log(`   Reservas: ${user.reservation_count} (sin reservas)\n`);
      }
    });
    
    if (corruptedCount === 0) {
      console.log('✅ No se encontraron datos corruptos. Base de datos OK.\n');
      return;
    }
    
    console.log(`🚨 TOTAL USUARIOS CORRUPTOS: ${corruptedCount}\n`);
    console.log('🔧 Corrigiendo datos...\n');
    
    // Corregir cada usuario corrupto
    for (const user of corruptedUsers) {
      const updateQuery = `
        UPDATE users 
        SET first_visit = true,
            free_trial_used = false,
            free_trial_date = NULL,
            updated_at = NOW()
        WHERE phone_number = $1
        RETURNING phone_number, name, first_visit, free_trial_used
      `;
      
      const updated = await pool.query(updateQuery, [user.phone_number]);
      const fixed = updated.rows[0];
      
      console.log(`✅ CORREGIDO: ${fixed.name || fixed.phone_number}`);
      console.log(`   first_visit: false → ${fixed.first_visit}`);
      console.log(`   free_trial_used: ${user.free_trial_used} → ${fixed.free_trial_used}\n`);
    }
    
    console.log(`\n🎉 ${corruptedCount} usuario(s) corregido(s) exitosamente!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixCorruptData()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Script falló:', err);
    process.exit(1);
  });
