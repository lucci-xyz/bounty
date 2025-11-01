import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';

// Token config matching server/config.js (without importing CONFIG to avoid env validation)
const TOKEN_CONFIG = {
  '0x036cbd53842c5426634e7929541ec2318f3dcf7e': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  }
};

// Test the normalization logic from server/routes/api.js
function buildByTokenObject(tokenStats) {
  const byToken = {};
  tokenStats.forEach(token => {
    const tokenAddress = token.token.toLowerCase();
    const tokenKey = Object.keys(TOKEN_CONFIG).find(key => key.toLowerCase() === tokenAddress);
    const tokenConfig = tokenKey ? TOKEN_CONFIG[tokenKey] : undefined;
    const decimals = tokenConfig?.decimals ?? 18;
    
    byToken[tokenAddress] = {
      count: token.count,
      totalValue: Number(token.total_value) / Math.pow(10, decimals),
      tvl: Number(token.tvl) / Math.pow(10, decimals),
      avgAmount: Number(token.avg_amount) / Math.pow(10, decimals),
      successRate: token.count > 0 ? (token.resolved_count / token.count) * 100 : 0
    };
  });
  return byToken;
}

// Replicate statsQueries.getAll logic for testing
function getStatsFromDB(db) {
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

  const total_tvl = tokenStats.reduce((sum, t) => {
    const tokenAddress = t.token.toLowerCase();
    const tokenKey = Object.keys(TOKEN_CONFIG).find(key => key.toLowerCase() === tokenAddress);
    const tokenConfig = tokenKey ? TOKEN_CONFIG[tokenKey] : undefined;
    const decimals = tokenConfig?.decimals ?? 18;
    const normalizedTvl = Number(t.tvl) / Math.pow(10, decimals);
    return sum + normalizedTvl;
  }, 0);

  const overall = {
    total_bounties: tokenStats.reduce((sum, t) => sum + t.count, 0),
    total_tvl,
    resolved_count: tokenStats.reduce((sum, t) => sum + t.resolved_count, 0)
  };

  return { tokenStats, overall };
}

describe('API Stats Endpoint Normalization', () => {
  let db;

  before(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

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

    const insert = db.prepare(`
      INSERT INTO bounties (
        bounty_id, repo_full_name, repo_id, issue_number,
        sponsor_address, token, amount, deadline, status,
        network, chain_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const USDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    const MUSD = process.env.MUSD_CONTRACT || '0xmusdaddress000000000000000000000000000';

    // USDC: 5000000 (5 USDC) resolved, 7000000 (7 USDC) + 2000000 (2 USDC) = 9000000 (9 USDC) open
    insert.run('b1', 'owner/repo', 1, 1, '0xsponsor', USDC, '5000000', now + 86400, 'resolved', 'base', 84532, now - 1000, now);
    insert.run('b2', 'owner/repo', 1, 2, '0xsponsor', USDC, '7000000', now + 86400, 'open', 'base', 84532, now - 2000, now);
    insert.run('b3', 'owner/repo', 1, 3, '0xsponsor', USDC, '2000000', now + 86400, 'open', 'base', 84532, now - 3000, now);

    // MUSD: 15000000000000000000 (15 MUSD) resolved, 10000000000000000000 (10 MUSD) open
    insert.run('b4', 'owner/repo', 1, 4, '0xsponsor', MUSD, '15000000000000000000', now + 86400, 'resolved', 'mezo', 31611, now - 4000, now);
    insert.run('b5', 'owner/repo', 1, 5, '0xsponsor', MUSD, '10000000000000000000', now + 86400, 'open', 'mezo', 31611, now - 5000, now);
  });

  after(() => {
    if (db) db.close();
  });

  it('should return stats with correct structure', () => {
    const { tokenStats, overall } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    assert.ok(byToken, 'Should have byToken object');
    assert.ok(overall, 'Should have overall object');

    assert.ok(typeof overall.total_bounties === 'number', 'total_bounties should be number');
    assert.ok(typeof overall.total_tvl === 'number', 'total_tvl should be number');
    assert.ok(typeof overall.resolved_count === 'number', 'resolved_count should be number');

    Object.entries(byToken).forEach(([address, stats]) => {
      assert.ok(typeof stats.count === 'number', 'count should be number');
      assert.ok(typeof stats.totalValue === 'number', 'totalValue should be number');
      assert.ok(typeof stats.tvl === 'number', 'tvl should be number');
      assert.ok(typeof stats.avgAmount === 'number', 'avgAmount should be number');
      assert.ok(typeof stats.successRate === 'number', 'successRate should be number');
    });
  });

  it('should calculate success rates correctly', () => {
    const { tokenStats } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    const usdcAddr = Object.keys(byToken).find(addr => addr.includes('036cbd'));
    const usdc = byToken[usdcAddr];

    // USDC: 1 resolved out of 3 total = 33.33%
    assert.ok(Math.abs(usdc.successRate - 33.333333333333336) < 0.01, 'Success rate should be calculated correctly');
  });

  it('should return valid JSON structure', () => {
    const { tokenStats, overall } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    const result = {
      byToken,
      overall,
      timestamp: Date.now()
    };

    assert.doesNotThrow(() => JSON.stringify(result), 'Should be valid JSON');
    
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    assert.ok(parsed.byToken, 'Should have byToken after parse');
    assert.ok(parsed.overall, 'Should have overall after parse');
  });

  it('should normalize TVL values in byToken by token decimals', () => {
    const { tokenStats } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    const usdcAddr = Object.keys(byToken).find(addr => addr.includes('036cbd'));
    const usdc = byToken[usdcAddr];

    // Raw TVL from DB: 9000000 (for USDC with 6 decimals)
    // Normalized: 9000000 / 10^6 = 9.0
    assert.strictEqual(usdc.tvl, 9.0, 'USDC TVL should be normalized to 9.0 (9000000 / 10^6)');

    const musdAddr = Object.keys(byToken).find(addr => addr.includes('musd'));
    if (musdAddr) {
      const musd = byToken[musdAddr];
      // Raw TVL from DB: 10000000000000000000 (for MUSD with 18 decimals)
      // Normalized: 10000000000000000000 / 10^18 = 10.0
      assert.strictEqual(musd.tvl, 10.0, 'MUSD TVL should be normalized to 10.0 (10000000000000000000 / 10^18)');
    }
  });

  it('should normalize totalValue in byToken by token decimals', () => {
    const { tokenStats } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    const usdcAddr = Object.keys(byToken).find(addr => addr.includes('036cbd'));
    const usdc = byToken[usdcAddr];

    // Raw total_value: 5000000 + 7000000 + 2000000 = 14000000
    // Normalized: 14000000 / 10^6 = 14.0
    assert.strictEqual(usdc.totalValue, 14.0, 'USDC totalValue should be normalized to 14.0');

    const musdAddr = Object.keys(byToken).find(addr => addr.includes('musd'));
    if (musdAddr) {
      const musd = byToken[musdAddr];
      // Raw total_value: 15000000000000000000 + 10000000000000000000 = 25000000000000000000
      // Normalized: 25000000000000000000 / 10^18 = 25.0
      assert.strictEqual(musd.totalValue, 25.0, 'MUSD totalValue should be normalized to 25.0');
    }
  });

  it('should normalize avgAmount in byToken by token decimals', () => {
    const { tokenStats } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    const usdcAddr = Object.keys(byToken).find(addr => addr.includes('036cbd'));
    const usdc = byToken[usdcAddr];

    // Raw avg_amount: 14000000 / 3 = 4666666.666...
    // Normalized: 4666666.666... / 10^6 ≈ 4.666...
    assert.ok(Math.abs(usdc.avgAmount - 4.666666666666667) < 0.0001, 'USDC avgAmount should be normalized correctly');
  });

  it('should have byToken TVL values consistent with overall.total_tvl calculation', () => {
    const { tokenStats, overall } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    // Sum of normalized TVL from byToken should equal overall.total_tvl
    const sumByTokenTVL = Object.values(byToken).reduce((sum, stats) => sum + stats.tvl, 0);
    assert.strictEqual(sumByTokenTVL, overall.total_tvl, 'Sum of byToken TVL should equal overall.total_tvl');

    // USDC TVL: 9.0, MUSD TVL: 10.0, Total: 19.0
    assert.strictEqual(overall.total_tvl, 19.0, 'Overall TVL should be sum of normalized TVLs (9.0 + 10.0)');
  });

  it('should not return raw database values in byToken', () => {
    const { tokenStats } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    const usdcAddr = Object.keys(byToken).find(addr => addr.includes('036cbd'));
    const usdc = byToken[usdcAddr];

    // Raw value would be 9000000, but normalized should be 9.0
    assert.notStrictEqual(usdc.tvl, 9000000, 'TVL should not be raw database value');
    assert.strictEqual(usdc.tvl, 9.0, 'TVL should be normalized');
  });

  it('should handle unknown tokens with default 18 decimals', () => {
    // Insert a token not in TOKEN_CONFIG
    const insert = db.prepare(`
      INSERT INTO bounties (
        bounty_id, repo_full_name, repo_id, issue_number,
        sponsor_address, token, amount, deadline, status,
        network, chain_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const unknownToken = '0xunknown00000000000000000000000000000000';
    const now = Date.now();
    // 1000000000000000000 = 1 token with 18 decimals (default)
    insert.run('b6', 'owner/repo', 1, 6, '0xsponsor', unknownToken, '1000000000000000000', now + 86400, 'open', 'base', 84532, now - 6000, now);

    const { tokenStats } = getStatsFromDB(db);
    const byToken = buildByTokenObject(tokenStats);

    const unknownAddr = Object.keys(byToken).find(addr => addr.includes('unknown'));
    if (unknownAddr) {
      const unknown = byToken[unknownAddr];
      // Should use default 18 decimals: 1000000000000000000 / 10^18 = 1.0
      assert.strictEqual(unknown.tvl, 1.0, 'Unknown token should use default 18 decimals');
    }
  });
});
