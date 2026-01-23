const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

(async () => {
  try {
    console.log('🔧 Ejecutando migration 004...');
    
    await pool.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS payment_transaction_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS payment_authorization_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
      ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP
    `);
    console.log('✅ Campos agregados');
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservations_transaction_number 
                      ON reservations(payment_transaction_number) 
                      WHERE payment_transaction_number IS NOT NULL`);
    console.log('✅ Índice transactionNumber creado');
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservations_authorization_code 
                      ON reservations(payment_authorization_code) 
                      WHERE payment_authorization_code IS NOT NULL`);
    console.log('✅ Índice authorizationCode creado');
    
    console.log('✅ Migration 004 completa');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
