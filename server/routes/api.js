import express from 'express';
import { bountyQueries, walletQueries, statsQueries } from '../db/index.js';
import { generateNonce, verifySIWE, createSIWEMessage } from '../auth/siwe.js';
import { handleBountyCreated } from '../github/webhooks.js';
import { getOctokit } from '../github/client.js';
import { CONFIG } from '../config.js';
import { computeBountyId, createRepoIdHash, getBountyFromContract } from '../blockchain/contract.js';

const router = express.Router();

/**
 * GET /api/nonce
 * Generate a SIWE nonce for wallet authentication
 */
router.get('/nonce', (req, res) => {
  const nonce = generateNonce();
  req.session.siweNonce = nonce;
  res.json({ nonce });
});

/**
 * POST /api/verify-wallet
 * Verify SIWE signature and return wallet address
 */
router.post('/verify-wallet', async (req, res) => {
  try {
    const { message, signature } = req.body;
    
    if (!message || !signature) {
      return res.status(400).json({ error: 'Missing message or signature' });
    }
    
    // Verify the signature
    const result = await verifySIWE(message, signature);
    
    if (!result.success) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Store wallet in session
    req.session.walletAddress = result.address;
    req.session.chainId = result.chainId;
    
    res.json({ 
      success: true, 
      address: result.address 
    });
  } catch (error) {
    console.error('Error verifying wallet:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/bounty/create
 * Record bounty creation after blockchain transaction
 */
router.post('/bounty/create', async (req, res) => {
  try {
    const { 
      repoFullName, 
      repoId, 
      issueNumber, 
      sponsorAddress, 
      token,
      amount, 
      deadline, 
      txHash,
      installationId,
      network = 'BASE_SEPOLIA',
      tokenSymbol = 'USDC'
    } = req.body;
    
    // Compute bountyId
    const repoIdHash = createRepoIdHash(repoId);
    const bountyId = await computeBountyId(sponsorAddress, repoIdHash, issueNumber);
    
    // Store in database
    bountyQueries.create({
      bountyId,
      repoFullName,
      repoId,
      issueNumber,
      sponsorAddress,
      sponsorGithubId: req.session.githubId || null,
      token: token || CONFIG.blockchain.usdcContract,
      amount,
      deadline,
      status: 'open',
      txHash,
      network,
      tokenSymbol
    });
    
    // Post GitHub comment
    await handleBountyCreated({
      repoFullName,
      issueNumber,
      bountyId,
      amount,
      deadline,
      sponsorAddress,
      txHash,
      installationId,
      network,
      tokenSymbol
    });
    
    res.json({ 
      success: true, 
      bountyId 
    });
  } catch (error) {
    console.error('Error creating bounty:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bounty/:bountyId
 * Get bounty details
 */
router.get('/bounty/:bountyId', async (req, res) => {
  try {
    const bounty = bountyQueries.findById(req.params.bountyId);
    
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    
    res.json(bounty);
  } catch (error) {
    console.error('Error fetching bounty:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/issue/:repoId/:issueNumber
 * Get bounties for an issue
 */
router.get('/issue/:repoId/:issueNumber', async (req, res) => {
  try {
    const { repoId, issueNumber } = req.params;
    const bounties = bountyQueries.findByIssue(parseInt(repoId), parseInt(issueNumber));
    
    res.json({ bounties });
  } catch (error) {
    console.error('Error fetching issue bounties:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/wallet/link
 * Link GitHub account to wallet address
 */
router.post('/wallet/link', async (req, res) => {
  try {
    const { githubId, githubUsername, walletAddress } = req.body;
    
    if (!githubId || !githubUsername || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify wallet is authenticated in session
    if (req.session.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Wallet not authenticated' });
    }
    
    // Store mapping
    walletQueries.create(githubId, githubUsername, walletAddress);
    
    res.json({ 
      success: true, 
      message: 'Wallet linked successfully' 
    });
  } catch (error) {
    console.error('Error linking wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/wallet/:githubId
 * Get wallet for GitHub user
 */
router.get('/wallet/:githubId', async (req, res) => {
  try {
    const mapping = walletQueries.findByGithubId(parseInt(req.params.githubId));
    
    if (!mapping) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json(mapping);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contract/bounty/:bountyId
 * Get bounty details from blockchain
 */
router.get('/contract/bounty/:bountyId', async (req, res) => {
  try {
    const bounty = await getBountyFromContract(req.params.bountyId);
    res.json(bounty);
  } catch (error) {
    console.error('Error fetching contract bounty:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tokens
 * Get token metadata configuration
 */
router.get('/tokens', (req, res) => {
  res.json(CONFIG.tokens);
});

/**
 * GET /api/stats
 * Get platform analytics and token comparison metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const { tokenStats, recent, overall } = statsQueries.getAll(20);

    // Build token comparison object
    const byToken = {};
    tokenStats.forEach(token => {
      byToken[token.token] = {
        count: token.count,
        totalValue: token.total_value,
        tvl: token.tvl,
        avgAmount: token.avg_amount,
        successRate: token.count > 0 ? (token.resolved_count / token.count) * 100 : 0
      };
    });

    // Calculate overall metrics
    const overallMetrics = {
      totalBounties: overall.total_bounties,
      totalTVL: overall.total_tvl,
      avgResolutionRate: overall.total_bounties > 0 
        ? (overall.resolved_count / overall.total_bounties) * 100 
        : 0
    };

    res.json({
      byToken,
      overall: overallMetrics,
      recent,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error generating stats:', error);
    res.status(500).json({ error: 'Failed to generate stats' });
  }
});

export default router;

