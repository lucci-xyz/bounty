import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { CONFIG } from '../server/config.js';

describe('Stats Database Queries', () => {
  let db;
  let statsQueries;

  before(async () => {
    // Create in-memory test database
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    // Create schema
    db.exec(`
      CREATE TABLE bounties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bounty_id TEXT UNIQUE NOT NULL,
        repo_full_name TEXT NOT NULL,
        repo_id INTEGER NOT NULL,
        issue_number INTEGER NOT NULL,
        sponsor_address TEXT NOT NULL,
        sponsor_github_id INTEGER,
        token TEXT NOT NULL,
        amount TEXT NOT NULL,
        deadline INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        tx_hash TEXT,
        network TEXT NOT NULL DEFAULT 'base',
        chain_id INTEGER NOT NULL DEFAULT 84532,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        pinned_comment_id INTEGER
      );

      CREATE INDEX idx_bounties_token ON bounties(token);
      CREATE INDEX idx_bounties_token_status ON bounties(token, status);
    `);

    // Create statsQueries with our test database
    statsQueries = {
      getAll: (limit = 20) => {
        const tokenStats = db.prepare(`
          SELECT 
            token,
            COUNT(*) as count,
            SUM(CAST(amount AS REAL)) as total_value,
            AVG(CAST(amount AS REAL)) as avg_amount,
            SUM(CASE WHEN status = 'open' THEN CAST(amount AS REAL) ELSE 0 END) as tvl,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
          FROM bounties
          GROUP BY token
        `).all();

        const recent = db.prepare(`
          SELECT 
            bounty_id,
            token,
            amount,
            status,
            created_at,
            repo_full_name,
            issue_number
          FROM bounties
          ORDER BY created_at DESC
          LIMIT ?
        `).all(limit);

        // Normalize TVL values to human-readable USD format before summing
        const total_tvl = tokenStats.reduce((sum, t) => {
          const tokenAddress = t.token.toLowerCase();
          // Case-insensitive lookup: find token config by comparing lowercase addresses
          const tokenConfig = CONFIG.tokens[tokenAddress] || 
            CONFIG.tokens[Object.keys(CONFIG.tokens).find(key => key.toLowerCase() === tokenAddress)];
          const decimals = tokenConfig?.decimals ?? 18;
          const normalizedTvl = Number(t.tvl) / Math.pow(10, decimals);
          return sum + normalizedTvl;
        }, 0);

        const overall = {
          total_bounties: tokenStats.reduce((sum, t) => sum + t.count, 0),
          total_tvl,
          resolved_count: tokenStats.reduce((sum, t) => sum + t.resolved_count, 0)
        };

        return { tokenStats, recent, overall };
      }
    };

    // Insert test data
    const insert = db.prepare(`
      INSERT INTO bounties (
        bounty_id, repo_full_name, repo_id, issue_number,
        sponsor_address, token, amount, deadline, status,
        network, chain_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const USDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    const MUSD = '0xmusdaddress000000000000000000000000000';

    // USDC bounties: 3 resolved, 2 open
    insert.run('bounty1', 'owner/repo', 1, 1, '0xsponsor', USDC, '5000000', now + 86400, 'resolved', 'base', 84532, now - 1000, now);
    insert.run('bounty2', 'owner/repo', 1, 2, '0xsponsor', USDC, '10000000', now + 86400, 'resolved', 'base', 84532, now - 2000, now);
    insert.run('bounty3', 'owner/repo', 1, 3, '0xsponsor', USDC, '3000000', now + 86400, 'resolved', 'base', 84532, now - 3000, now);
    insert.run('bounty4', 'owner/repo', 1, 4, '0xsponsor', USDC, '7000000', now + 86400, 'open', 'base', 84532, now - 4000, now);
    insert.run('bounty5', 'owner/repo', 1, 5, '0xsponsor', USDC, '2000000', now + 86400, 'open', 'base', 84532, now - 5000, now);

    // MUSD bounties: 2 resolved, 1 open
    insert.run('bounty6', 'owner/repo', 1, 6, '0xsponsor', MUSD, '15000000000000000000', now + 86400, 'resolved', 'mezo', 2016, now - 6000, now);
    insert.run('bounty7', 'owner/repo', 1, 7, '0xsponsor', MUSD, '25000000000000000000', now + 86400, 'resolved', 'mezo', 2016, now - 7000, now);
    insert.run('bounty8', 'owner/repo', 1, 8, '0xsponsor', MUSD, '10000000000000000000', now + 86400, 'open', 'mezo', 2016, now - 8000, now);
  });

  after(() => {
    if (db) db.close();
  });

  it('should return token aggregates', () => {
    const result = statsQueries.getAll(20);
    
    assert.strictEqual(result.tokenStats.length, 2, 'Should have 2 tokens');
    
    const usdc = result.tokenStats.find(t => t.token.includes('036cbd'));
    assert.ok(usdc, 'Should have USDC stats');
    assert.strictEqual(usdc.count, 5, 'USDC should have 5 bounties');
    assert.strictEqual(usdc.resolved_count, 3, 'USDC should have 3 resolved');
    
    const musd = result.tokenStats.find(t => t.token.includes('musd'));
    assert.ok(musd, 'Should have MUSD stats');
    assert.strictEqual(musd.count, 3, 'MUSD should have 3 bounties');
    assert.strictEqual(musd.resolved_count, 2, 'MUSD should have 2 resolved');
  });

  it('should calculate TVL correctly (open bounties only)', () => {
    const result = statsQueries.getAll(20);
    
    const usdc = result.tokenStats.find(t => t.token.includes('036cbd'));
    // Open: 7000000 + 2000000 = 9000000
    assert.strictEqual(usdc.tvl, 9000000, 'USDC TVL should be sum of open bounties');
    
    const musd = result.tokenStats.find(t => t.token.includes('musd'));
    // Open: 10000000000000000000
    assert.strictEqual(musd.tvl, 10000000000000000000, 'MUSD TVL should be sum of open bounties');
  });

  it('should calculate average amounts correctly', () => {
    const result = statsQueries.getAll(20);
    
    const usdc = result.tokenStats.find(t => t.token.includes('036cbd'));
    // (5000000 + 10000000 + 3000000 + 7000000 + 2000000) / 5 = 5400000
    assert.strictEqual(usdc.avg_amount, 5400000, 'USDC average should be correct');
  });

  it('should return overall stats', () => {
    const result = statsQueries.getAll(20);
    
    assert.strictEqual(result.overall.total_bounties, 8, 'Total bounties should be 8');
    assert.strictEqual(result.overall.resolved_count, 5, 'Resolved count should be 5');
    
    // TVL normalized: 9000000 / 10^6 (USDC) + 10000000000000000000 / 10^18 (MUSD) = 9.0 + 10.0 = 19.0
    const expectedTVL = 19.0;
    assert.strictEqual(result.overall.total_tvl, expectedTVL, 'Total TVL should be normalized sum of all open');
  });

  it('should return recent activity', () => {
    const result = statsQueries.getAll(5);
    
    assert.strictEqual(result.recent.length, 5, 'Should limit to 5 results');
    
    // Should be in DESC order (most recent first)
    assert.strictEqual(result.recent[0].bounty_id, 'bounty1', 'Most recent should be first');
    assert.strictEqual(result.recent[4].bounty_id, 'bounty5', 'Oldest in limit should be last');
  });

  it('should handle empty database', () => {
    // Clear all data
    db.exec('DELETE FROM bounties');
    
    const result = statsQueries.getAll(20);
    
    assert.strictEqual(result.tokenStats.length, 0, 'Should have no token stats');
    assert.strictEqual(result.overall.total_bounties, 0, 'Total bounties should be 0');
    assert.strictEqual(result.overall.total_tvl, 0, 'Total TVL should be 0');
    assert.strictEqual(result.overall.resolved_count, 0, 'Resolved count should be 0');
    assert.strictEqual(result.recent.length, 0, 'Should have no recent activity');
  });
});

