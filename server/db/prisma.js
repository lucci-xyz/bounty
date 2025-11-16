/**
 * Legacy compatibility layer - Re-exports from refactored database services
 * 
 * This file maintains backward compatibility with existing code while the database
 * logic has been refactored into focused, smaller modules in server/services/database/
 */

export {
  initDB,
  prisma,
  bountyQueries,
  walletQueries,
  prClaimQueries,
  userQueries,
  allowlistQueries,
  statsQueries
} from '../services/database/index.js';

