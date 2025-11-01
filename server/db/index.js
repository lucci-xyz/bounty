import Database from 'better-sqlite3';
import { SCHEMA } from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'bounty.db');

let db = null;

/**
 * Initialize database connection and create tables
 */
export function initDB() {
  if (db) return db;
  
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(SCHEMA);
  
  console.log('✅ Database initialized');
  return db;
}

/**
 * Get database instance
 */
export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

// Bounty queries
export const bountyQueries = {
  create: (bountyData) => {
    const stmt = getDB().prepare(`
      INSERT INTO bounties (
        bounty_id, repo_full_name, repo_id, issue_number, 
        sponsor_address, sponsor_github_id, amount, deadline, 
        status, tx_hash, network, token_symbol, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      bountyData.bountyId,
      bountyData.repoFullName,
      bountyData.repoId,
      bountyData.issueNumber,
      bountyData.sponsorAddress,
      bountyData.sponsorGithubId,
      bountyData.amount,
      bountyData.deadline,
      bountyData.status,
      bountyData.txHash,
      bountyData.network || 'BASE_SEPOLIA',
      bountyData.tokenSymbol || 'USDC',
      Date.now(),
      Date.now()
    );
  },

  findByIssue: (repoId, issueNumber) => {
    const stmt = getDB().prepare(`
      SELECT * FROM bounties 
      WHERE repo_id = ? AND issue_number = ? AND status = 'open'
      ORDER BY created_at DESC
    `);
    return stmt.all(repoId, issueNumber);
  },

  findById: (bountyId) => {
    const stmt = getDB().prepare('SELECT * FROM bounties WHERE bounty_id = ?');
    return stmt.get(bountyId);
  },

  updateStatus: (bountyId, status, txHash = null) => {
    const stmt = getDB().prepare(`
      UPDATE bounties 
      SET status = ?, tx_hash = COALESCE(?, tx_hash), updated_at = ?
      WHERE bounty_id = ?
    `);
    return stmt.run(status, txHash, Date.now(), bountyId);
  },

  updatePinnedComment: (bountyId, commentId) => {
    const stmt = getDB().prepare(`
      UPDATE bounties SET pinned_comment_id = ?, updated_at = ? WHERE bounty_id = ?
    `);
    return stmt.run(commentId, Date.now(), bountyId);
  },

  getExpired: () => {
    const now = Math.floor(Date.now() / 1000);
    const stmt = getDB().prepare(`
      SELECT * FROM bounties WHERE status = 'open' AND deadline < ?
    `);
    return stmt.all(now);
  }
};

// Wallet mapping queries
export const walletQueries = {
  create: (githubId, githubUsername, walletAddress) => {
    const stmt = getDB().prepare(`
      INSERT OR REPLACE INTO wallet_mappings (
        github_id, github_username, wallet_address, verified_at, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
      githubId,
      githubUsername,
      walletAddress.toLowerCase(),
      Date.now(),
      Date.now()
    );
  },

  findByGithubId: (githubId) => {
    const stmt = getDB().prepare('SELECT * FROM wallet_mappings WHERE github_id = ?');
    return stmt.get(githubId);
  },

  findByWallet: (walletAddress) => {
    const stmt = getDB().prepare(
      'SELECT * FROM wallet_mappings WHERE wallet_address = ?'
    );
    return stmt.get(walletAddress.toLowerCase());
  }
};

// PR claim queries
export const prClaimQueries = {
  create: (bountyId, prNumber, prAuthorId, repoFullName) => {
    const stmt = getDB().prepare(`
      INSERT INTO pr_claims (
        bounty_id, pr_number, pr_author_github_id, repo_full_name, 
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(bountyId, prNumber, prAuthorId, repoFullName, 'pending', Date.now());
  },

  findByPR: (repoFullName, prNumber) => {
    const stmt = getDB().prepare(`
      SELECT * FROM pr_claims 
      WHERE repo_full_name = ? AND pr_number = ?
    `);
    return stmt.all(repoFullName, prNumber);
  },

  updateStatus: (id, status, txHash = null, resolvedAt = null) => {
    const stmt = getDB().prepare(`
      UPDATE pr_claims 
      SET status = ?, tx_hash = COALESCE(?, tx_hash), 
          resolved_at = COALESCE(?, resolved_at)
      WHERE id = ?
    `);
    return stmt.run(status, txHash, resolvedAt, id);
  }
};

