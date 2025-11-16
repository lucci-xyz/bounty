/**
 * Convert Prisma BigInt fields to numbers for JSON serialization
 */

export function convertBounty(bounty) {
  if (!bounty) return null;
  
  return {
    ...bounty,
    repoId: Number(bounty.repoId),
    sponsorGithubId: bounty.sponsorGithubId ? Number(bounty.sponsorGithubId) : null,
    deadline: Number(bounty.deadline),
    createdAt: Number(bounty.createdAt),
    updatedAt: Number(bounty.updatedAt),
    pinnedCommentId: bounty.pinnedCommentId ? Number(bounty.pinnedCommentId) : null
  };
}

export function convertWallet(wallet) {
  if (!wallet) return null;
  
  return {
    ...wallet,
    githubId: Number(wallet.githubId),
    verifiedAt: Number(wallet.verifiedAt),
    createdAt: Number(wallet.createdAt)
  };
}

export function convertPRClaim(claim) {
  if (!claim) return null;
  
  return {
    ...claim,
    prAuthorGithubId: Number(claim.prAuthorGithubId),
    createdAt: Number(claim.createdAt),
    resolvedAt: claim.resolvedAt ? Number(claim.resolvedAt) : null
  };
}

export function convertUser(user) {
  if (!user) return null;
  
  return {
    ...user,
    githubId: Number(user.githubId),
    createdAt: Number(user.createdAt),
    updatedAt: Number(user.updatedAt)
  };
}

export function convertAllowlist(allowlist) {
  if (!allowlist) return null;
  
  return {
    ...allowlist,
    repoId: allowlist.repoId ? Number(allowlist.repoId) : null,
    createdAt: Number(allowlist.createdAt)
  };
}
