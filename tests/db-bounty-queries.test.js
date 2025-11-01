import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';

describe('Bounty Database Queries', () => {
  let db;
  let bountyQueries;

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
    `);

    bountyQueries = {
      create: (bountyData) => {
        const stmt = db.prepare(`
          INSERT INTO bounties (
            bounty_id, repo_full_name, repo_id, issue_number, 
            sponsor_address, sponsor_github_id, token, amount, deadline, 
            status, tx_hash, network, chain_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
          bountyData.bountyId,
          bountyData.repoFullName,
          bountyData.repoId,
          bountyData.issueNumber,
          bountyData.sponsorAddress,
          bountyData.sponsorGithubId,
          bountyData.token,
          bountyData.amount,
          bountyData.deadline,
          bountyData.status,
          bountyData.txHash,
          bountyData.network || 'base',
          bountyData.chainId || 84532,
          Date.now(),
          Date.now()
        );
      },
      findById: (bountyId) => {
        const stmt = db.prepare('SELECT * FROM bounties WHERE bounty_id = ?');
        return stmt.get(bountyId);
      }
    };
  });

  after(() => {
    if (db) db.close();
  });

  it('should create bounty with all fields', () => {
    const bountyData = {
      bountyId: 'test-bounty-1',
      repoFullName: 'owner/repo',
      repoId: 12345,
      issueNumber: 42,
      sponsorAddress: '0x1234567890123456789012345678901234567890',
      sponsorGithubId: 67890,
      token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '1000000',
      deadline: Math.floor(Date.now() / 1000) + 86400,
      status: 'open',
      txHash: '0xabc123',
      network: 'base',
      chainId: 84532
    };

    const result = bountyQueries.create(bountyData);
    assert.strictEqual(result.changes, 1, 'Should insert 1 row');

    const bounty = bountyQueries.findById('test-bounty-1');
    assert.ok(bounty, 'Bounty should exist');
    assert.strictEqual(bounty.bounty_id, 'test-bounty-1');
    assert.strictEqual(bounty.token, bountyData.token);
    assert.strictEqual(bounty.network, 'base');
    assert.strictEqual(bounty.chain_id, 84532);
  });

  it('should default network and chain_id when not provided', () => {
    const bountyData = {
      bountyId: 'test-bounty-2',
      repoFullName: 'owner/repo',
      repoId: 12345,
      issueNumber: 43,
      sponsorAddress: '0x1234567890123456789012345678901234567890',
      token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '2000000',
      deadline: Math.floor(Date.now() / 1000) + 86400,
      status: 'open',
      txHash: '0xdef456'
    };

    bountyQueries.create(bountyData);
    const bounty = bountyQueries.findById('test-bounty-2');
    
    assert.strictEqual(bounty.network, 'base');
    assert.strictEqual(bounty.chain_id, 84532);
  });

  it('should support Mezo network and chain_id', () => {
    const bountyData = {
      bountyId: 'test-bounty-3',
      repoFullName: 'owner/repo',
      repoId: 12345,
      issueNumber: 44,
      sponsorAddress: '0x1234567890123456789012345678901234567890',
      token: '0xmusdaddress000000000000000000000000000',
      amount: '3000000000000000000',
      deadline: Math.floor(Date.now() / 1000) + 86400,
      status: 'open',
      txHash: '0xghi789',
      network: 'mezo',
      chainId: 2016
    };

    bountyQueries.create(bountyData);
    const bounty = bountyQueries.findById('test-bounty-3');
    
    assert.strictEqual(bounty.network, 'mezo');
    assert.strictEqual(bounty.chain_id, 2016);
    assert.ok(bounty.token.includes('musd'));
  });

  it('should handle token field correctly', () => {
    const usdcBounty = {
      bountyId: 'test-bounty-4',
      repoFullName: 'owner/repo',
      repoId: 12345,
      issueNumber: 45,
      sponsorAddress: '0x1234567890123456789012345678901234567890',
      token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '5000000',
      deadline: Math.floor(Date.now() / 1000) + 86400,
      status: 'open',
      txHash: '0xjkl012'
    };

    bountyQueries.create(usdcBounty);
    const bounty = bountyQueries.findById('test-bounty-4');
    
    assert.strictEqual(bounty.token, usdcBounty.token);
  });
});

