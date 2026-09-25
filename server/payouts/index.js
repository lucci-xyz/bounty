import { ethers } from 'ethers';
import { CONFIG } from '@/server/config.js';
import { bountyQueries, walletQueries, prClaimQueries, allowlistQueries } from '@/server/db/prisma.js';
import { resolveBountyOnNetwork } from '@/server/blockchain/contract.js';
import { settleClaim as settleClaimWith, settleContributorClaims as settleContributorClaimsWith } from './settleClaim.js';

export { SETTLEMENT, RESOLVE_GRACE_SECONDS, toPublicSettlement } from './settleClaim.js';

/**
 * The production database and chain behind `settleClaim`.
 *
 * @returns {import('./settleClaim.js').SettlementDeps}
 */
export function payoutDeps() {
  return {
    environment: CONFIG.envTarget || 'stage',
    now: () => Date.now(),
    isAddress: (address) => ethers.isAddress(address),
    findBounty: (bountyId) => bountyQueries.findById(bountyId),
    findWallet: (githubId) => walletQueries.findByGithubId(githubId),
    findClaimsByContributor: (githubId) => prClaimQueries.findByContributor(githubId),
    checkAllowed: (bountyId, address) => allowlistQueries.checkAllowed(bountyId, address),
    resolveOnChain: (bountyId, address, network) => resolveBountyOnNetwork(bountyId, address, network),
    markClaim: async (claimId, status, { txHash = null, resolvedAt = null } = {}) => {
      const claim = await prClaimQueries.updateStatus(claimId, status, txHash, resolvedAt);
      if (!claim) throw new Error(`Claim ${claimId} not found`);
      return claim;
    },
    markBountyResolved: (bountyId, txHash) => bountyQueries.updateStatus(bountyId, 'resolved', txHash)
  };
}

/** Settle one claim against production. See `settleClaim.js`. */
export function settleClaim(claim, options) {
  return settleClaimWith(claim, payoutDeps(), options);
}

/** Settle every contributor-settleable claim against production. See `settleClaim.js`. */
export function settleContributorClaims(githubId, options) {
  return settleContributorClaimsWith(githubId, payoutDeps(), options);
}
