import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

(async () => {
  try {
    console.log('🧹 Limpiando TODA la base de datos...');
    
    // Contar antes
    const resCount = await pool.query('SELECT COUNT(*) as total FROM reservations');
    const pendCount = await pool.query('SELECT COUNT(*) as total FROM pending_confirmations');
    const formCount = await pool.query('SELECT COUNT(*) as total FROM partial_forms');
    
    console.log('📊 Registros ANTES:');
    console.log('  - Reservas:', resCount.rows[0].total);
    console.log('  - Confirmaciones pendientes:', pendCount.rows[0].total);
    console.log('  - Formularios parciales:', formCount.rows[0].total);
    
    // Limpiar TODO
    await pool.query('DELETE FROM reservations');
    await pool.query('DELETE FROM pending_confirmations');
    await pool.query('DELETE FROM partial_forms');
    await pool.query('UPDATE users SET email = NULL, free_trial_used = false, free_trial_date = NULL');
    
    console.log('✅ Base de datos completamente limpia');
    console.log('✅ Cache de usuarios reseteado');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
