#!/usr/bin/env node
/**
 * Migration 002: Add follow-up tracking columns
 * Execute: node scripts/migrations/002-add-follow-up-columns.js
 */

import databaseService from '../../src/database/database.js';

async function runMigration() {
  console.log('🔧 Migration 002: Adding follow-up tracking columns...\n');

  try {
    await databaseService.initialize();
    
    console.log('📝 Adding columns to users table...');
    
    await databaseService.run(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS transaction_started_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS transaction_agent VARCHAR(50),
      ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMP
    `);
    
    console.log('✅ Columns added successfully\n');
    
    console.log('📊 Creating indexes...');
    
    await databaseService.run(`
      CREATE INDEX IF NOT EXISTS idx_users_transaction_started 
      ON users(transaction_started_at) 
      WHERE transaction_started_at IS NOT NULL
    `);
    
    await databaseService.run(`
      CREATE INDEX IF NOT EXISTS idx_users_follow_up_sent 
      ON users(follow_up_sent_at) 
      WHERE follow_up_sent_at IS NOT NULL
    `);
    
    console.log('✅ Indexes created successfully\n');
    
    console.log('🎉 Migration 002 completed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
