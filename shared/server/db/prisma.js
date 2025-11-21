import { PrismaClient } from '@prisma/client';
import { CONFIG } from '../config.js';

// Create Prisma Client instance
const prisma = new PrismaClient();

/**
 * Initialize Postgres database tables
 */
export async function initDB() {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    throw error;
  }
}

let hasIssueMetadataColumns;

async function supportsIssueMetadata() {
  if (hasIssueMetadataColumns !== undefined) return hasIssueMetadataColumns;
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bounties'
      AND table_schema = current_schema()
      AND column_name IN ('issue_title', 'issue_description')
    `;
    hasIssueMetadataColumns = result.length > 0;
  } catch {
    hasIssueMetadataColumns = false;
  }
  return hasIssueMetadataColumns;
}

async function getBountySelect() {
  const includeIssueMetadata = await supportsIssueMetadata();
  return {
    bountyId: true,
    repoFullName: true,
    repoId: true,
    issueNumber: true,
    sponsorAddress: true,
    sponsorGithubId: true,
    token: true,
    amount: true,
    deadline: true,
    status: true,
    txHash: true,
    network: true,
    chainId: true,
    tokenSymbol: true,
    environment: true,
    createdAt: true,
    updatedAt: true,
    pinnedCommentId: true,
    ...(includeIssueMetadata
      ? {
          issueTitle: true,
          issueDescription: true
        }
      : {})
  };
}

function normalizeBounty(bounty) {
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

// Bounty queries
export const bountyQueries = {
  create: async (bountyData) => {
    const environment = CONFIG.envTarget || 'stage';
    const includeIssueMetadata = await supportsIssueMetadata();
    const bountySelect = await getBountySelect();
    
    // Validate required fields
    if (!bountyData.network) {
      throw new Error('Network alias is required to create bounty');
    }
    if (!bountyData.chainId) {
      throw new Error('Chain ID is required to create bounty');
    }
    if (!bountyData.tokenSymbol) {
      throw new Error('Token symbol is required to create bounty');
    }
    
    const data = {
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
      network: bountyData.network,
      chainId: bountyData.chainId,
      tokenSymbol: bountyData.tokenSymbol,
      environment: environment,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now())
    };

    if (includeIssueMetadata) {
      data.issueTitle = bountyData.issueTitle || null;
      data.issueDescription = bountyData.issueDescription || null;
    }

    const bounty = await prisma.bounty.create({
      data,
      select: bountySelect
    });
    
    return normalizeBounty(bounty);
  },

  findByIssue: async (repoId, issueNumber) => {
    const environment = CONFIG.envTarget || 'stage';
    const bountySelect = await getBountySelect();
    
    const bounties = await prisma.bounty.findMany({
      where: {
        repoId: BigInt(repoId),
        issueNumber: issueNumber,
        status: 'open',
        environment: environment
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: bountySelect
    });
    
    return bounties.map(normalizeBounty);
  },

  findById: async (bountyId) => {
    const bountySelect = await getBountySelect();
    const bounty = await prisma.bounty.findUnique({
      where: { bountyId },
      select: bountySelect
    });
    
    return normalizeBounty(bounty);
  },

  updateStatus: async (bountyId, status, txHash = null) => {
    const bountySelect = await getBountySelect();
    const bounty = await prisma.bounty.update({
      where: { bountyId },
      data: {
        status,
        txHash: txHash || undefined,
        updatedAt: BigInt(Date.now())
      },
      select: bountySelect
    });
    
    return normalizeBounty(bounty);
  },

  updatePinnedComment: async (bountyId, commentId) => {
    const bountySelect = await getBountySelect();
    const bounty = await prisma.bounty.update({
      where: { bountyId },
      data: {
        pinnedCommentId: BigInt(commentId),
        updatedAt: BigInt(Date.now())
      },
      select: bountySelect
    });
    
    return normalizeBounty(bounty);
  },

  getExpired: async () => {
    const now = Math.floor(Date.now() / 1000);
    const bountySelect = await getBountySelect();
    const bounties = await prisma.bounty.findMany({
      where: {
        status: 'open',
        deadline: {
          lt: BigInt(now)
        }
      },
      select: bountySelect
    });
    
    return bounties.map(normalizeBounty);
  },

  getAllOpen: async (repoId, environment) => {
    const bountySelect = await getBountySelect();
    const bounties = await prisma.bounty.findMany({
      where: {
        repoId: BigInt(repoId),
        status: 'open',
        environment: environment
      },
      orderBy: {
        amount: 'desc' // Show highest bounties first
      },
      select: bountySelect
    });
    
    return bounties.map(normalizeBounty);
  },

  findAllOpen: async () => {
    const environment = CONFIG.envTarget || 'stage';
    const bountySelect = await getBountySelect();
    const bounties = await prisma.bounty.findMany({
      where: {
        status: 'open',
        environment: environment
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: bountySelect
    });
    
    return bounties.map(normalizeBounty);
  },

  findBySponsor: async (sponsorGithubId) => {
    const environment = CONFIG.envTarget || 'stage';
    const bountySelect = await getBountySelect();
    const bounties = await prisma.bounty.findMany({
      where: {
        sponsorGithubId: BigInt(sponsorGithubId),
        environment: environment
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: bountySelect
    });
    
    return bounties.map(normalizeBounty);
  }
};

// Wallet mapping queries
export const walletQueries = {
  create: async (githubId, githubUsername, walletAddress) => {
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
    
    return {
      ...wallet,
      githubId: Number(wallet.githubId),
      verifiedAt: Number(wallet.verifiedAt),
      createdAt: Number(wallet.createdAt)
    };
  },

  findByGithubId: async (githubId) => {
    const wallet = await prisma.walletMapping.findUnique({
      where: { githubId: BigInt(githubId) }
    });
    
    if (!wallet) return null;
    
    return {
      ...wallet,
      githubId: Number(wallet.githubId),
      verifiedAt: Number(wallet.verifiedAt),
      createdAt: Number(wallet.createdAt)
    };
  },

  findByWallet: async (walletAddress) => {
    const wallet = await prisma.walletMapping.findFirst({
      where: { walletAddress: walletAddress.toLowerCase() }
    });
    
    if (!wallet) return null;
    
    return {
      ...wallet,
      githubId: Number(wallet.githubId),
      verifiedAt: Number(wallet.verifiedAt),
      createdAt: Number(wallet.createdAt)
    };
  },

  delete: async (githubId) => {
    const wallet = await prisma.walletMapping.delete({
      where: { githubId: BigInt(githubId) }
    });
    
    return {
      ...wallet,
      githubId: Number(wallet.githubId),
      verifiedAt: Number(wallet.verifiedAt),
      createdAt: Number(wallet.createdAt)
    };
  }
};

// PR claim queries
export const prClaimQueries = {
  create: async (bountyId, prNumber, prAuthorId, repoFullName) => {
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
    
    return {
      ...claim,
      prAuthorGithubId: Number(claim.prAuthorGithubId),
      createdAt: Number(claim.createdAt),
      resolvedAt: claim.resolvedAt ? Number(claim.resolvedAt) : null
    };
  },

  findByPR: async (repoFullName, prNumber) => {
    const claims = await prisma.prClaim.findMany({
      where: {
        repoFullName,
        prNumber
      }
    });
    
    return claims.map(c => ({
      ...c,
      prAuthorGithubId: Number(c.prAuthorGithubId),
      createdAt: Number(c.createdAt),
      resolvedAt: c.resolvedAt ? Number(c.resolvedAt) : null
    }));
  },

  updateStatus: async (id, status, txHash = null, resolvedAt = null) => {
    const claim = await prisma.prClaim.update({
      where: { id },
      data: {
        status,
        txHash: txHash || undefined,
        resolvedAt: resolvedAt ? BigInt(resolvedAt) : undefined
      }
    });
    
    return {
      ...claim,
      prAuthorGithubId: Number(claim.prAuthorGithubId),
      createdAt: Number(claim.createdAt),
      resolvedAt: claim.resolvedAt ? Number(claim.resolvedAt) : null
    };
  },

  findByContributor: async (prAuthorGithubId) => {
    const claims = await prisma.prClaim.findMany({
      where: {
        prAuthorGithubId: BigInt(prAuthorGithubId)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return claims.map(c => ({
      ...c,
      prAuthorGithubId: Number(c.prAuthorGithubId),
      createdAt: Number(c.createdAt),
      resolvedAt: c.resolvedAt ? Number(c.resolvedAt) : null
    }));
  },

  countByBountyIds: async (bountyIds = []) => {
    if (!Array.isArray(bountyIds) || bountyIds.length === 0) {
      return {};
    }

    const counts = await prisma.prClaim.groupBy({
      by: ['bountyId'],
      _count: {
        bountyId: true
      },
      where: {
        bountyId: {
          in: bountyIds
        }
      }
    });

    return counts.reduce((acc, entry) => {
      acc[entry.bountyId] = entry._count?.bountyId ? Number(entry._count.bountyId) : 0;
      return acc;
    }, {});
  }
};

// Stats queries for analytics
export const statsQueries = {
  getAll: async (limit = 20) => {
    const environment = CONFIG.envTarget || 'stage';

    // Get token stats with aggregations
    const tokenStats = await prisma.$queryRaw`
      SELECT 
        token,
        COUNT(*)::int as count,
        SUM(CAST(amount AS NUMERIC)) as total_value,
        AVG(CAST(amount AS NUMERIC)) as avg_amount,
        SUM(CASE WHEN status = 'open' THEN CAST(amount AS NUMERIC) ELSE 0 END) as tvl,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)::int as resolved_count
      FROM bounties
      WHERE environment = ${environment}
      GROUP BY token
    `;

    // Get recent activity
    const recent = await prisma.bounty.findMany({
      where: { environment },
      select: {
        bountyId: true,
        token: true,
        amount: true,
        status: true,
        createdAt: true,
        repoFullName: true,
        issueNumber: true,
        environment: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Calculate overall stats
    const total_tvl = tokenStats.reduce((sum, t) => {
      const tokenAddress = t.token.toLowerCase();
      const tokenKey = Object.keys(CONFIG.tokens).find(key => key.toLowerCase() === tokenAddress);
      const tokenConfig = tokenKey ? CONFIG.tokens[tokenKey] : undefined;
      const decimals = tokenConfig?.decimals ?? 18;
      const normalizedTvl = Number(t.tvl) / Math.pow(10, decimals);
      return sum + normalizedTvl;
    }, 0);

    const overall = {
      total_bounties: tokenStats.reduce((sum, t) => sum + Number(t.count), 0),
      total_tvl,
      resolved_count: tokenStats.reduce((sum, t) => sum + Number(t.resolved_count), 0)
    };

    // Convert BigInt to numbers in recent
    const recentConverted = recent.map(r => ({
      ...r,
      createdAt: Number(r.createdAt)
    }));

    return { tokenStats, recent: recentConverted, overall };
  }
};

// User queries
export const userQueries = {
  upsert: async (githubData) => {
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
    
    return {
      ...user,
      githubId: Number(user.githubId),
      createdAt: Number(user.createdAt),
      updatedAt: Number(user.updatedAt)
    };
  },

  findByGithubId: async (githubId) => {
    const user = await prisma.user.findUnique({
      where: { githubId: BigInt(githubId) }
    });
    
    if (!user) return null;
    
    return {
      ...user,
      githubId: Number(user.githubId),
      createdAt: Number(user.createdAt),
      updatedAt: Number(user.updatedAt)
    };
  },

  updatePreferences: async (userId, preferences) => {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        preferences,
        updatedAt: BigInt(Date.now())
      }
    });
    
    return {
      ...user,
      githubId: Number(user.githubId),
      createdAt: Number(user.createdAt),
      updatedAt: Number(user.updatedAt)
    };
  }
};

// Allowlist queries
export const allowlistQueries = {
  create: async (userId, bountyId, repoId, allowedAddress) => {
    const allowlist = await prisma.allowlist.create({
      data: {
        userId,
        bountyId: bountyId || null,
        repoId: repoId ? BigInt(repoId) : null,
        allowedAddress: allowedAddress.toLowerCase(),
        createdAt: BigInt(Date.now())
      }
    });
    
    return {
      ...allowlist,
      repoId: allowlist.repoId ? Number(allowlist.repoId) : null,
      createdAt: Number(allowlist.createdAt)
    };
  },

  findByBounty: async (bountyId) => {
    const allowlists = await prisma.allowlist.findMany({
      where: { bountyId },
      include: { user: true }
    });
    
    return allowlists.map(a => ({
      ...a,
      repoId: a.repoId ? Number(a.repoId) : null,
      createdAt: Number(a.createdAt),
      user: {
        ...a.user,
        githubId: Number(a.user.githubId),
        createdAt: Number(a.user.createdAt),
        updatedAt: Number(a.user.updatedAt)
      }
    }));
  },

  findByRepo: async (repoId, userId) => {
    const allowlists = await prisma.allowlist.findMany({
      where: {
        repoId: BigInt(repoId),
        userId,
        bountyId: null
      }
    });
    
    return allowlists.map(a => ({
      ...a,
      repoId: a.repoId ? Number(a.repoId) : null,
      createdAt: Number(a.createdAt)
    }));
  },

  checkAllowed: async (bountyId, address) => {
    const bounty = await prisma.bounty.findUnique({
      where: { bountyId }
    });
    
    if (!bounty || !bounty.sponsorGithubId) return true; // No sponsor or allowlist
    
    const user = await prisma.user.findUnique({
      where: { githubId: bounty.sponsorGithubId }
    });
    
    if (!user) return true; // No user account = no allowlist
    
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
  },

  remove: async (id) => {
    await prisma.allowlist.delete({
      where: { id }
    });
    return { success: true };
  }
};

// Export prisma client for direct use if needed
export { prisma };

