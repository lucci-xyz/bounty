#!/usr/bin/env node
/**
 * Database migration script
 * Run: npm run migrate
 */

import { initDB } from './index.js';

console.log('🔄 Running database migrations...\n');

try {
  const db = initDB();
  
  console.log('✅ All migrations completed successfully!\n');
  console.log('Database ready at:', process.env.DATABASE_PATH || './server/db/bounty.db');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

