import { prisma } from './client.js';
import { convertWallet } from './converters.js';

/**
 * Database queries for wallet mapping operations
 */

export async function createOrUpdateWallet(githubId, githubUsername, walletAddress) {
  const wallet = await prisma.walletMapping.upsert({
    where: { githubId: BigInt(githubId) },
    update: {
      githubUsername,
      walletAddress: walletAddress.toLowerCase(),
      verifiedAt: BigInt(Date.now())
    },
    create: {
      githubId: BigInt(githubId),
      githubUsername,
      walletAddress: walletAddress.toLowerCase(),
      verifiedAt: BigInt(Date.now()),
      createdAt: BigInt(Date.now())
    }
  });
  
  return convertWallet(wallet);
}

export async function findWalletByGithubId(githubId) {
  const wallet = await prisma.walletMapping.findUnique({
    where: { githubId: BigInt(githubId) }
  });
  
  return convertWallet(wallet);
}

export async function findWalletByAddress(walletAddress) {
  const wallet = await prisma.walletMapping.findFirst({
    where: { walletAddress: walletAddress.toLowerCase() }
  });
  
  return convertWallet(wallet);
}

export async function deleteWallet(githubId) {
  const wallet = await prisma.walletMapping.delete({
    where: { githubId: BigInt(githubId) }
  });
  
  return convertWallet(wallet);
}
