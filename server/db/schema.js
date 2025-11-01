/**
 * Database schema initialization
 */

export const SCHEMA = `
-- Bounties table: stores all bounty information
CREATE TABLE IF NOT EXISTS bounties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bounty_id TEXT UNIQUE NOT NULL,           -- bytes32 from contract
  repo_full_name TEXT NOT NULL,             -- e.g., "owner/repo"
  repo_id INTEGER NOT NULL,
  issue_number INTEGER NOT NULL,
  sponsor_address TEXT NOT NULL,
  sponsor_github_id INTEGER,
  token TEXT NOT NULL,                      -- ERC-20 token address (USDC or MUSD)
  amount TEXT NOT NULL,                     -- Store as string to handle big numbers
  deadline INTEGER NOT NULL,                -- Unix timestamp
  status TEXT NOT NULL DEFAULT 'open',      -- open, resolved, refunded, canceled
  tx_hash TEXT,                             -- Transaction hash for creation
  network TEXT NOT NULL DEFAULT 'base',    -- Network name (base, mezo)
  chain_id INTEGER NOT NULL DEFAULT 84532,  -- Chain ID
  created_at INTEGER NOT NULL,              -- Unix timestamp
  updated_at INTEGER NOT NULL,              -- Unix timestamp
  pinned_comment_id INTEGER,                -- GitHub comment ID for pinned summary
  UNIQUE(repo_id, issue_number, sponsor_address)
);

-- Wallet mappings: links GitHub users to their wallet addresses
CREATE TABLE IF NOT EXISTS wallet_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  verified_at INTEGER NOT NULL,            -- Unix timestamp
  created_at INTEGER NOT NULL
);

-- PR bounty claims: tracks which PRs are linked to bounties
CREATE TABLE IF NOT EXISTS pr_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bounty_id TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_author_github_id INTEGER NOT NULL,
  repo_full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, paid, failed
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  tx_hash TEXT,                             -- Resolution transaction hash
  FOREIGN KEY(bounty_id) REFERENCES bounties(bounty_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bounties_repo ON bounties(repo_id, issue_number);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_token ON bounties(token);
CREATE INDEX IF NOT EXISTS idx_bounties_token_status ON bounties(token, status);
CREATE INDEX IF NOT EXISTS idx_pr_claims_bounty ON pr_claims(bounty_id);
CREATE INDEX IF NOT EXISTS idx_wallet_github ON wallet_mappings(github_id);
`;

