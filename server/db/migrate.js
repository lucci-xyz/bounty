#!/usr/bin/env node
/**
 * Database migration script
 * Run: npm run migrate
 */

import { initDB, getDB } from './index.js';

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

console.log('🔄 Running database migrations...\n');

try {
  const db = initDB();
  
  // Migration: Add token column to bounties table
  console.log('📝 Checking for token column...');
  const tableInfo = db.pragma('table_info(bounties)');
  const hasTokenColumn = tableInfo.some(col => col.name === 'token');
  
  if (!hasTokenColumn) {
    console.log('➕ Adding token column to bounties table...');
    db.exec(`ALTER TABLE bounties ADD COLUMN token TEXT NOT NULL DEFAULT '${USDC_ADDRESS}'`);
    
    // Create indexes for token
    console.log('📊 Creating token indexes...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_bounties_token ON bounties(token)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_bounties_token_status ON bounties(token, status)');
    
    console.log('✅ Token column added successfully');
  } else {
    console.log('✓ Token column already exists');
  }
  
  console.log('\n✅ All migrations completed successfully!\n');
  console.log('Database ready at:', process.env.DATABASE_PATH || './server/db/bounty.db');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

