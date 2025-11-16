import { prisma } from './client.js';
import { convertUser } from './converters.js';

/**
 * Database queries for user operations
 */

export async function upsertUser(githubData) {
  const user = await prisma.user.upsert({
    where: { githubId: BigInt(githubData.githubId) },
    update: {
      githubUsername: githubData.githubUsername,
      email: githubData.email || null,
      avatarUrl: githubData.avatarUrl || null,
      updatedAt: BigInt(Date.now())
    },
    create: {
      githubId: BigInt(githubData.githubId),
      githubUsername: githubData.githubUsername,
      email: githubData.email || null,
      avatarUrl: githubData.avatarUrl || null,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now())
    }
  });
  
  return convertUser(user);
}

export async function findUserByGithubId(githubId) {
  const user = await prisma.user.findUnique({
    where: { githubId: BigInt(githubId) }
  });
  
  return convertUser(user);
}

export async function updateUserPreferences(userId, preferences) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      preferences,
      updatedAt: BigInt(Date.now())
    }
  });
  
  return convertUser(user);
}
