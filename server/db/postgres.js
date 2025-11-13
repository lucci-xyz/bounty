import { sql } from '@vercel/postgres';
import { CONFIG } from '../config.js';

/**
 * Initialize Postgres database tables
 */
export async function initDB() {
  try {
    console.log('🔄 Initializing Postgres database...');

    // Create bounties table with environment tracking
    await sql`
      CREATE TABLE IF NOT EXISTS bounties (
        id SERIAL PRIMARY KEY,
        bounty_id TEXT UNIQUE NOT NULL,
        repo_full_name TEXT NOT NULL,
        repo_id BIGINT NOT NULL,
        issue_number INTEGER NOT NULL,
        sponsor_address TEXT NOT NULL,
        sponsor_github_id BIGINT,
        token TEXT NOT NULL,
        amount TEXT NOT NULL,
        deadline BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        tx_hash TEXT,
        network TEXT NOT NULL DEFAULT 'BASE_SEPOLIA',
        chain_id INTEGER NOT NULL DEFAULT 84532,
        token_symbol TEXT NOT NULL DEFAULT 'USDC',
        environment TEXT NOT NULL DEFAULT 'stage',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        pinned_comment_id BIGINT,
        UNIQUE(repo_id, issue_number, sponsor_address, network, environment)
      )
    `;

    // Create wallet_mappings table
    await sql`
      CREATE TABLE IF NOT EXISTS wallet_mappings (
        id SERIAL PRIMARY KEY,
        github_id BIGINT UNIQUE NOT NULL,
        github_username TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        verified_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `;

    // Create pr_claims table
    await sql`
      CREATE TABLE IF NOT EXISTS pr_claims (
        id SERIAL PRIMARY KEY,
        bounty_id TEXT NOT NULL,
        pr_number INTEGER NOT NULL,
        pr_author_github_id BIGINT NOT NULL,
        repo_full_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at BIGINT NOT NULL,
        resolved_at BIGINT,
        tx_hash TEXT
      )
    `;

    // Create indexes for efficient queries
    await sql`CREATE INDEX IF NOT EXISTS idx_bounties_repo ON bounties(repo_id, issue_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bounties_token ON bounties(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bounties_token_status ON bounties(token, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bounties_environment ON bounties(environment)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pr_claims_bounty ON pr_claims(bounty_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wallet_github ON wallet_mappings(github_id)`;

    console.log('✅ Postgres database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Postgres database:', error);
    throw error;
  }
}

// Bounty queries
export const bountyQueries = {
  create: async (bountyData) => {
    const environment = CONFIG.envTarget || 'stage';
    
    const result = await sql`
      INSERT INTO bounties (
        bounty_id, repo_full_name, repo_id, issue_number,
        sponsor_address, sponsor_github_id, token, amount, deadline,
        status, tx_hash, network, chain_id, token_symbol, environment,
        created_at, updated_at
      ) VALUES (
        ${bountyData.bountyId}, ${bountyData.repoFullName}, ${bountyData.repoId},
        ${bountyData.issueNumber}, ${bountyData.sponsorAddress}, ${bountyData.sponsorGithubId || null},
        ${bountyData.token}, ${bountyData.amount}, ${bountyData.deadline},
        ${bountyData.status}, ${bountyData.txHash || null}, ${bountyData.network || 'BASE_SEPOLIA'},
        ${bountyData.chainId || 84532}, ${bountyData.tokenSymbol || 'USDC'}, ${environment},
        ${Date.now()}, ${Date.now()}
      )
      RETURNING *
    `;
    return result.rows[0];
  },

  findByIssue: async (repoId, issueNumber) => {
    const environment = CONFIG.envTarget || 'stage';
    
    const result = await sql`
      SELECT * FROM bounties
      WHERE repo_id = ${repoId} 
        AND issue_number = ${issueNumber} 
        AND status = 'open'
        AND environment = ${environment}
      ORDER BY created_at DESC
    `;
    return result.rows;
  },

  findById: async (bountyId) => {
    const result = await sql`
      SELECT * FROM bounties WHERE bounty_id = ${bountyId}
    `;
    return result.rows[0];
  },

  updateStatus: async (bountyId, status, txHash = null) => {
    const result = await sql`
      UPDATE bounties
      SET status = ${status}, 
          tx_hash = COALESCE(${txHash}, tx_hash),
          updated_at = ${Date.now()}
      WHERE bounty_id = ${bountyId}
      RETURNING *
    `;
    return result.rows[0];
  },

  updatePinnedComment: async (bountyId, commentId) => {
    const result = await sql`
      UPDATE bounties
      SET pinned_comment_id = ${commentId},
          updated_at = ${Date.now()}
      WHERE bounty_id = ${bountyId}
      RETURNING *
    `;
    return result.rows[0];
  },

  getExpired: async () => {
    const now = Math.floor(Date.now() / 1000);
    const result = await sql`
      SELECT * FROM bounties 
      WHERE status = 'open' AND deadline < ${now}
    `;
    return result.rows;
  }
};

// Wallet mapping queries
export const walletQueries = {
  create: async (githubId, githubUsername, walletAddress) => {
    const result = await sql`
      INSERT INTO wallet_mappings (
        github_id, github_username, wallet_address, verified_at, created_at
      ) VALUES (
        ${githubId}, ${githubUsername}, ${walletAddress.toLowerCase()},
        ${Date.now()}, ${Date.now()}
      )
      ON CONFLICT (github_id)
      DO UPDATE SET
        github_username = EXCLUDED.github_username,
        wallet_address = EXCLUDED.wallet_address,
        verified_at = EXCLUDED.verified_at
      RETURNING *
    `;
    return result.rows[0];
  },

  findByGithubId: async (githubId) => {
    const result = await sql`
      SELECT * FROM wallet_mappings WHERE github_id = ${githubId}
    `;
    return result.rows[0];
  },

  findByWallet: async (walletAddress) => {
    const result = await sql`
      SELECT * FROM wallet_mappings 
      WHERE wallet_address = ${walletAddress.toLowerCase()}
    `;
    return result.rows[0];
  }
};

// PR claim queries
export const prClaimQueries = {
  create: async (bountyId, prNumber, prAuthorId, repoFullName) => {
    const result = await sql`
      INSERT INTO pr_claims (
        bounty_id, pr_number, pr_author_github_id, repo_full_name,
        status, created_at
      ) VALUES (
        ${bountyId}, ${prNumber}, ${prAuthorId}, ${repoFullName},
        'pending', ${Date.now()}
      )
      RETURNING *
    `;
    return result.rows[0];
  },

  findByPR: async (repoFullName, prNumber) => {
    const result = await sql`
      SELECT * FROM pr_claims
      WHERE repo_full_name = ${repoFullName} AND pr_number = ${prNumber}
    `;
    return result.rows;
  },

  updateStatus: async (id, status, txHash = null, resolvedAt = null) => {
    const result = await sql`
      UPDATE pr_claims
      SET status = ${status},
          tx_hash = COALESCE(${txHash}, tx_hash),
          resolved_at = COALESCE(${resolvedAt}, resolved_at)
      WHERE id = ${id}
      RETURNING *
    `;
    return result.rows[0];
  }
};

// Stats queries for analytics
export const statsQueries = {
  getAll: async (limit = 20) => {
    const environment = CONFIG.envTarget || 'stage';

    // Token aggregates with TVL - filtered by environment
    const tokenStatsResult = await sql`
      SELECT 
        token,
        COUNT(*) as count,
        SUM(CAST(amount AS NUMERIC)) as total_value,
        AVG(CAST(amount AS NUMERIC)) as avg_amount,
        SUM(CASE WHEN status = 'open' THEN CAST(amount AS NUMERIC) ELSE 0 END) as tvl,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM bounties
      WHERE environment = ${environment}
      GROUP BY token
    `;
    const tokenStats = tokenStatsResult.rows;

    // Recent activity - filtered by environment
    const recentResult = await sql`
      SELECT 
        bounty_id,
        token,
        amount,
        status,
        created_at,
        repo_full_name,
        issue_number,
        environment
      FROM bounties
      WHERE environment = ${environment}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    const recent = recentResult.rows;

    // Calculate overall stats from aggregates
    const total_tvl = tokenStats.reduce((sum, t) => {
      const tokenAddress = t.token.toLowerCase();
      const tokenKey = Object.keys(CONFIG.tokens).find(key => key.toLowerCase() === tokenAddress);
      const tokenConfig = tokenKey ? CONFIG.tokens[tokenKey] : undefined;
      const decimals = tokenConfig?.decimals ?? 18;
      const normalizedTvl = Number(t.tvl) / Math.pow(10, decimals);
      return sum + normalizedTvl;
    }, 0);

    const overall = {
      total_bounties: tokenStats.reduce((sum, t) => sum + Number(t.count), 0),
      total_tvl,
      resolved_count: tokenStats.reduce((sum, t) => sum + Number(t.resolved_count), 0)
    };

    return { tokenStats, recent, overall };
  }
};

