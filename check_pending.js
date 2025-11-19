import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPending() {
  try {
    const result = await pool.query(`
      SELECT user_phone, reservation_data, expires_at, created_at
      FROM pending_confirmations 
      WHERE user_phone = '+593987770788'
    `);
    
    console.log('📋 Pending Confirmations:\n');
    if (result.rows.length === 0) {
      console.log('❌ No hay confirmaciones pendientes');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`Registro ${i + 1}:`);
        console.log(`  Phone: ${row.user_phone}`);
        console.log(`  Expires: ${row.expires_at}`);
        console.log(`  Created: ${row.created_at}`);
        console.log(`  Data (raw):`, row.reservation_data);
        console.log(`  Data (parsed):`, typeof row.reservation_data === 'string' ? JSON.parse(row.reservation_data) : row.reservation_data);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPending();
