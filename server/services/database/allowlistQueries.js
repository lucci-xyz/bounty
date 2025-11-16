import { prisma } from './client.js';
import { convertAllowlist, convertUser } from './converters.js';

/**
 * Database queries for allowlist operations
 */

export async function createAllowlistEntry(userId, bountyId, repoId, allowedAddress) {
  const allowlist = await prisma.allowlist.create({
    data: {
      userId,
      bountyId: bountyId || null,
      repoId: repoId ? BigInt(repoId) : null,
      allowedAddress: allowedAddress.toLowerCase(),
      createdAt: BigInt(Date.now())
    }
  });
  
  return convertAllowlist(allowlist);
}

export async function findAllowlistByBounty(bountyId) {
  const allowlists = await prisma.allowlist.findMany({
    where: { bountyId },
    include: { user: true }
  });
  
  return allowlists.map(a => ({
    ...convertAllowlist(a),
    user: convertUser(a.user)
  }));
}

export async function findAllowlistByRepo(repoId, userId) {
  const allowlists = await prisma.allowlist.findMany({
    where: {
      repoId: BigInt(repoId),
      userId,
      bountyId: null
    }
  });
  
  return allowlists.map(convertAllowlist);
}

export async function checkAddressAllowed(bountyId, address) {
  const bounty = await prisma.bounty.findUnique({
    where: { bountyId }
  });
  
  if (!bounty || !bounty.sponsorGithubId) return true;
  
  const user = await prisma.user.findUnique({
    where: { githubId: bounty.sponsorGithubId }
  });
  
  if (!user) return true;
  
  // Check bounty-specific allowlist
  const bountyAllowlist = await prisma.allowlist.findFirst({
    where: {
      userId: user.id,
      bountyId,
      allowedAddress: address.toLowerCase()
    }
  });
  
  if (bountyAllowlist) return true;
  
  // Check repo-level allowlist
  const repoAllowlist = await prisma.allowlist.findFirst({
    where: {
      userId: user.id,
      repoId: bounty.repoId,
      bountyId: null,
      allowedAddress: address.toLowerCase()
    }
  });
  
  return !!repoAllowlist;
}

export async function removeAllowlistEntry(id) {
  await prisma.allowlist.delete({
    where: { id }
  });
  return { success: true };
}
