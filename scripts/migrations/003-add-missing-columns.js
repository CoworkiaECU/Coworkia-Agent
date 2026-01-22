/**
 * Migration 003: Add missing columns to partial_forms and reservation_state
 * Date: 2026-01-22
 * Purpose: Fix schema errors found in cron cleanup jobs
 * 
 * Run with: heroku run node scripts/migrations/003-add-missing-columns.js --app coworkia-agent
 */

import pg from 'pg';
const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Iniciando migración 003: Add missing columns...');
    
    // Add expires_at to partial_forms
    console.log('📋 Verificando columna expires_at en partial_forms...');
    const checkExpiresAt = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'partial_forms' AND column_name = 'expires_at'
    `);
    
    if (checkExpiresAt.rows.length === 0) {
      console.log('➕ Agregando columna expires_at a partial_forms...');
      await pool.query('ALTER TABLE partial_forms ADD COLUMN expires_at TIMESTAMP');
      console.log('✅ Columna expires_at agregada exitosamente');
      
      // Update existing rows
      const updateResult = await pool.query(`
        UPDATE partial_forms 
        SET expires_at = updated_at + INTERVAL '24 hours'
        WHERE expires_at IS NULL AND updated_at IS NOT NULL
      `);
      console.log(`✅ Actualizados ${updateResult.rowCount} registros con expires_at`);
    } else {
      console.log('ℹ️  Columna expires_at ya existe en partial_forms');
    }
    
    // Add created_at to reservation_state
    console.log('📋 Verificando columna created_at en reservation_state...');
    const checkCreatedAt = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservation_state' AND column_name = 'created_at'
    `);
    
    if (checkCreatedAt.rows.length === 0) {
      console.log('➕ Agregando columna created_at a reservation_state...');
      await pool.query('ALTER TABLE reservation_state ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('✅ Columna created_at agregada exitosamente');
      
      // Update existing rows
      const updateResult = await pool.query(`
        UPDATE reservation_state
        SET created_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
        WHERE created_at IS NULL
      `);
      console.log(`✅ Actualizados ${updateResult.rowCount} registros con created_at`);
    } else {
      console.log('ℹ️  Columna created_at ya existe en reservation_state');
    }
    
    console.log('✅ Migración 003 completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('📜 Detalles:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
