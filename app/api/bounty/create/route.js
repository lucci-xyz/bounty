import { getSession } from '@/lib/session';
import { bountyQueries } from '@/server/db/prisma';
import { handleBountyCreated } from '@/server/github/webhooks';
import { computeBountyIdOnNetwork, createRepoIdHash } from '@/server/blockchain/contract';
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

    return Response.json({
      success: true,
      bountyId
    });
  } catch (error) {
    console.error('Error creating bounty:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

