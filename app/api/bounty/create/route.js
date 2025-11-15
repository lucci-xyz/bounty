import { getSession } from '@/lib/session';
import { bountyQueries, userQueries } from '@/server/db/prisma';
import { handleBountyCreated } from '@/server/github/webhooks';
import { computeBountyIdOnNetwork, createRepoIdHash } from '@/server/blockchain/contract';
import { getGitHubApp, initGitHubApp } from '@/server/github/client';
import { CONFIG } from '@/server/config';

/**
 * Map network name to chain ID
 */
function getChainIdFromNetwork(network) {
  const networkMap = {
    'BASE_SEPOLIA': 84532,
    'MEZO_TESTNET': 31611
  };
  return networkMap[network] || 84532;
}

export async function POST(request) {
  try {
    const session = await getSession();
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
    } = await request.json();

    // Compute bountyId
    const repoIdHash = createRepoIdHash(repoId);
    const bountyId = await computeBountyIdOnNetwork(sponsorAddress, repoIdHash, issueNumber, network);

    // Derive chainId from network
    const chainId = getChainIdFromNetwork(network);

    // Auto-create or update user if session exists (backward compatible)
    if (session && session.githubId) {
      try {
        await userQueries.upsert({
          githubId: session.githubId,
          githubUsername: session.githubUsername,
          email: session.email,
          avatarUrl: session.avatarUrl
        });
      } catch (userError) {
        console.warn('Failed to upsert user (non-critical):', userError.message);
        // Don't fail the request if user creation fails
      }
    }

    // Store in database
    await bountyQueries.create({
      bountyId,
      repoFullName,
      repoId,
      issueNumber,
      sponsorAddress,
      sponsorGithubId: session.githubId || null,
      token: token || CONFIG.blockchain.usdcContract,
      amount,
      deadline,
      status: 'open',
      txHash,
      network,
      chainId,
      tokenSymbol
    });

    // Post GitHub comment (skip in local mode or if no installation)
    if (installationId && installationId > 0) {
      try {
        // Initialize GitHub App if needed
        try {
          getGitHubApp();
        } catch {
          console.log('📱 Initializing GitHub App...');
          initGitHubApp();
        }

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
      } catch (githubError) {
        console.warn('⚠️ Failed to post GitHub comment (non-critical):', githubError.message);
        // Don't fail the entire request if GitHub comment fails
      }
    } else {
      console.log('⏭️ Skipping GitHub comment (no installation ID)');
    }

    return Response.json({
      success: true,
      bountyId
    });
  } catch (error) {
    console.error('Error creating bounty:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

