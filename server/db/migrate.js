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
  if (!columns.includes('token')) {
    console.log('Adding token column...');
    db.exec(`ALTER TABLE bounties ADD COLUMN token TEXT NOT NULL DEFAULT '${USDC_ADDRESS}'`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_bounties_token ON bounties(token)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_bounties_token_status ON bounties(token, status)');
    console.log('✓ Token column added');
  } else {
    console.log('✓ Token column exists');
  }

  // Migration: Add network column
  if (!columns.includes('network')) {
    console.log('Adding network column...');
    db.exec('ALTER TABLE bounties ADD COLUMN network TEXT NOT NULL DEFAULT \'BASE_SEPOLIA\'');
    console.log('✓ Network column added');
  } else {
    console.log('✓ Network column exists');
  }

  // Migration: Add chain_id column
  if (!columns.includes('chain_id')) {
    console.log('Adding chain_id column...');
    db.exec('ALTER TABLE bounties ADD COLUMN chain_id INTEGER NOT NULL DEFAULT 84532');
    console.log('✓ Chain ID column added');
  } else {
    console.log('✓ Chain ID column exists');
  }

  // Migration: Add token_symbol column
  if (!columns.includes('token_symbol')) {
    console.log('Adding token_symbol column...');
    db.exec("ALTER TABLE bounties ADD COLUMN token_symbol TEXT NOT NULL DEFAULT 'USDC'");
    console.log('✓ Token symbol column added');
  } else {
    console.log('✓ Token symbol column exists');
  }

  console.log('\n✅ Migrations completed\n');

  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

