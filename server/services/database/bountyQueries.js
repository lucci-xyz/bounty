import { prisma } from './client.js';
import { convertBounty } from './converters.js';
import { CONFIG } from '../../config.js';

/**
 * Database queries for bounty operations
 */

export async function createBounty(bountyData) {
  const environment = CONFIG.envTarget || 'stage';
  
  const bounty = await prisma.bounty.create({
    data: {
      bountyId: bountyData.bountyId,
      repoFullName: bountyData.repoFullName,
      repoId: BigInt(bountyData.repoId),
      issueNumber: bountyData.issueNumber,
      sponsorAddress: bountyData.sponsorAddress,
      sponsorGithubId: bountyData.sponsorGithubId ? BigInt(bountyData.sponsorGithubId) : null,
      token: bountyData.token,
      amount: bountyData.amount,
      deadline: BigInt(bountyData.deadline),
      status: bountyData.status,
      txHash: bountyData.txHash || null,
      network: bountyData.network || 'BASE_SEPOLIA',
      chainId: bountyData.chainId || 84532,
      tokenSymbol: bountyData.tokenSymbol || 'USDC',
      environment: environment,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now())
    }
  });
  
  return convertBounty(bounty);
}

export async function findBountyById(bountyId) {
  const bounty = await prisma.bounty.findUnique({
    where: { bountyId }
  });
  
  return convertBounty(bounty);
}

export async function findBountiesByIssue(repoId, issueNumber) {
  const environment = CONFIG.envTarget || 'stage';
  
  const bounties = await prisma.bounty.findMany({
    where: {
      repoId: BigInt(repoId),
      issueNumber: issueNumber,
      status: 'open',
      environment: environment
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return bounties.map(convertBounty);
}

export async function updateBountyStatus(bountyId, status, txHash = null) {
  const bounty = await prisma.bounty.update({
    where: { bountyId },
    data: {
      status,
      txHash: txHash || undefined,
      updatedAt: BigInt(Date.now())
    }
  });
  
  return convertBounty(bounty);
}

export async function updateBountyPinnedComment(bountyId, commentId) {
  const bounty = await prisma.bounty.update({
    where: { bountyId },
    data: {
      pinnedCommentId: BigInt(commentId),
      updatedAt: BigInt(Date.now())
    }
  });
  
  return convertBounty(bounty);
}

export async function findExpiredBounties() {
  const now = Math.floor(Date.now() / 1000);
  const bounties = await prisma.bounty.findMany({
    where: {
      status: 'open',
      deadline: {
        lt: BigInt(now)
      }
    }
  });
  
  return bounties.map(convertBounty);
}

export async function findOpenBountiesByRepo(repoId, environment) {
  const bounties = await prisma.bounty.findMany({
    where: {
      repoId: BigInt(repoId),
      status: 'open',
      environment: environment
    },
    orderBy: {
      amount: 'desc'
    }
  });
  
  return bounties.map(convertBounty);
}

export async function findAllOpenBounties() {
  const environment = CONFIG.envTarget || 'stage';
  const bounties = await prisma.bounty.findMany({
    where: {
      status: 'open',
      environment: environment
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return bounties.map(convertBounty);
}

export async function findBountiesBySponsor(sponsorGithubId) {
  const environment = CONFIG.envTarget || 'stage';
  const bounties = await prisma.bounty.findMany({
    where: {
      sponsorGithubId: BigInt(sponsorGithubId),
      environment: environment
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return bounties.map(convertBounty);
}
