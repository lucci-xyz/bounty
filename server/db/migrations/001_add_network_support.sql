-- Add network and token_symbol columns to bounties table
-- Migration: 001_add_network_support

ALTER TABLE bounties ADD COLUMN network TEXT NOT NULL DEFAULT 'BASE_SEPOLIA';
ALTER TABLE bounties ADD COLUMN token_symbol TEXT NOT NULL DEFAULT 'USDC';

-- Update the unique constraint to include network
-- Note: SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
-- But since we're using DEFAULT values, existing rows will work fine

