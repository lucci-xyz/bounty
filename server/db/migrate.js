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

  // Get table structure once to avoid redundant queries
  console.log('📝 Checking bounties table structure...');
  const tableInfo = db.pragma('table_info(bounties)');
  const hasTokenColumn = tableInfo.some(col => col.name === 'token');
  const hasNetworkColumn = tableInfo.some(col => col.name === 'network');
  const hasChainIdColumn = tableInfo.some(col => col.name === 'chain_id');

  // Migration: Add token column to bounties table
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

  // Migration: Add network and chain_id columns
  if (!hasNetworkColumn) {
    console.log('➕ Adding network column to bounties table...');
    db.exec('ALTER TABLE bounties ADD COLUMN network TEXT NOT NULL DEFAULT \'BASE_SEPOLIA\'');
    console.log('✅ Network column added successfully');
  } else {
    console.log('✓ Network column already exists');
  }

  if (!hasChainIdColumn) {
    console.log('➕ Adding chain_id column to bounties table...');
    db.exec('ALTER TABLE bounties ADD COLUMN chain_id INTEGER NOT NULL DEFAULT 84532');
    console.log('✅ Chain ID column added successfully');
  } else {
    console.log('✓ Chain ID column already exists');
  }

  console.log('\n✅ All migrations completed successfully!\n');
  console.log('Database ready at:', process.env.DATABASE_PATH || './server/db/bounty.db');

  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

