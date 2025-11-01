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

  const tableInfo = db.pragma('table_info(bounties)');
  const columns = tableInfo.map(col => col.name);

  // Migration: Add token column to bounties table
  console.log('📝 Checking for token column...');
  if (!columns.includes('token')) {
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

  // Migration: Add network and chain_id columns (from main branch)
  console.log('📝 Checking for network column...');
  if (!columns.includes('network')) {
    console.log('➕ Adding network column to bounties table...');
    db.exec('ALTER TABLE bounties ADD COLUMN network TEXT NOT NULL DEFAULT \'BASE_SEPOLIA\'');
    console.log('✅ Network column added successfully');
  } else {
    console.log('✓ Network column already exists');
  }

  console.log('📝 Checking for chain_id column...');
  if (!columns.includes('chain_id')) {
    console.log('➕ Adding chain_id column to bounties table...');
    db.exec('ALTER TABLE bounties ADD COLUMN chain_id INTEGER NOT NULL DEFAULT 84532');
    console.log('✅ Chain ID column added successfully');
  } else {
    console.log('✓ Chain ID column already exists');
  }

  console.log('📝 Checking for token_symbol column...');
  if (!columns.includes('token_symbol')) {
    console.log('➕ Adding token_symbol column to bounties table...');
    db.exec("ALTER TABLE bounties ADD COLUMN token_symbol TEXT NOT NULL DEFAULT 'USDC'");
    console.log('✅ token_symbol column added successfully');
  } else {
    console.log('✓ token_symbol column already exists');
  }

  console.log('\n✅ All migrations completed successfully!\n');
  console.log('Database ready at:', process.env.DATABASE_PATH || './server/db/bounty.db');

  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

