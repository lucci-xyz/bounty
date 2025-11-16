import { prisma } from './client.js';
import { convertPRClaim } from './converters.js';

/**
 * Database queries for PR claim operations
 */

export async function createPRClaim(bountyId, prNumber, prAuthorId, repoFullName) {
  const claim = await prisma.prClaim.create({
    data: {
      bountyId,
      prNumber,
      prAuthorGithubId: BigInt(prAuthorId),
      repoFullName,
      status: 'pending',
      createdAt: BigInt(Date.now())
    }
  });
  
  return convertPRClaim(claim);
}

export async function findPRClaimsByPR(repoFullName, prNumber) {
  const claims = await prisma.prClaim.findMany({
    where: {
      repoFullName,
      prNumber
    }
  });
  
  return claims.map(convertPRClaim);
}

export async function updatePRClaimStatus(id, status, txHash = null, resolvedAt = null) {
  const claim = await prisma.prClaim.update({
    where: { id },
    data: {
      status,
      txHash: txHash || undefined,
      resolvedAt: resolvedAt ? BigInt(resolvedAt) : undefined
    }
  });
  
  return convertPRClaim(claim);
}

export async function findPRClaimsByContributor(prAuthorGithubId) {
  const claims = await prisma.prClaim.findMany({
    where: {
      prAuthorGithubId: BigInt(prAuthorGithubId)
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return claims.map(convertPRClaim);
}
