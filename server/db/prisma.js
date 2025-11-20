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

// Bounty queries
export const bountyQueries = {
  create: async (bountyData) => {
    const environment = CONFIG.envTarget || 'stage';
    
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
    
    const bounty = await prisma.bounty.create({
      data: {
        bountyId: bountyData.bountyId,
        repoFullName: bountyData.repoFullName,
        repoId: BigInt(bountyData.repoId),
        issueNumber: bountyData.issueNumber,
        issueTitle: bountyData.issueTitle || null,
        issueDescription: bountyData.issueDescription || null,
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
      }
    });
    
    // Convert BigInt to numbers for JSON serialization
    return {
      ...bounty,
      repoId: Number(bounty.repoId),
      sponsorGithubId: bounty.sponsorGithubId ? Number(bounty.sponsorGithubId) : null,
      deadline: Number(bounty.deadline),
      createdAt: Number(bounty.createdAt),
      updatedAt: Number(bounty.updatedAt),
      pinnedCommentId: bounty.pinnedCommentId ? Number(bounty.pinnedCommentId) : null
    };
  },

  findByIssue: async (repoId, issueNumber) => {
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
    
    return bounties.map(b => ({
      ...b,
      repoId: Number(b.repoId),
      sponsorGithubId: b.sponsorGithubId ? Number(b.sponsorGithubId) : null,
      deadline: Number(b.deadline),
      createdAt: Number(b.createdAt),
      updatedAt: Number(b.updatedAt),
      pinnedCommentId: b.pinnedCommentId ? Number(b.pinnedCommentId) : null
    }));
  },

  findById: async (bountyId) => {
    const bounty = await prisma.bounty.findUnique({
      where: { bountyId }
    });
    
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
  },

  updateStatus: async (bountyId, status, txHash = null) => {
    const bounty = await prisma.bounty.update({
      where: { bountyId },
      data: {
        status,
        txHash: txHash || undefined,
        updatedAt: BigInt(Date.now())
      }
    });
    
    return {
      ...bounty,
      repoId: Number(bounty.repoId),
      sponsorGithubId: bounty.sponsorGithubId ? Number(bounty.sponsorGithubId) : null,
      deadline: Number(bounty.deadline),
      createdAt: Number(bounty.createdAt),
      updatedAt: Number(bounty.updatedAt),
      pinnedCommentId: bounty.pinnedCommentId ? Number(bounty.pinnedCommentId) : null
    };
  },

  updatePinnedComment: async (bountyId, commentId) => {
    const bounty = await prisma.bounty.update({
      where: { bountyId },
      data: {
        pinnedCommentId: BigInt(commentId),
        updatedAt: BigInt(Date.now())
      }
    });
    
    return {
      ...bounty,
      repoId: Number(bounty.repoId),
      sponsorGithubId: bounty.sponsorGithubId ? Number(bounty.sponsorGithubId) : null,
      deadline: Number(bounty.deadline),
      createdAt: Number(bounty.createdAt),
      updatedAt: Number(bounty.updatedAt),
      pinnedCommentId: bounty.pinnedCommentId ? Number(bounty.pinnedCommentId) : null
    };
  },

  getExpired: async () => {
    const now = Math.floor(Date.now() / 1000);
    const bounties = await prisma.bounty.findMany({
      where: {
        status: 'open',
        deadline: {
          lt: BigInt(now)
        }
      }
    });
    
    return bounties.map(b => ({
      ...b,
      repoId: Number(b.repoId),
      sponsorGithubId: b.sponsorGithubId ? Number(b.sponsorGithubId) : null,
      deadline: Number(b.deadline),
      createdAt: Number(b.createdAt),
      updatedAt: Number(b.updatedAt),
      pinnedCommentId: b.pinnedCommentId ? Number(b.pinnedCommentId) : null
    }));
  },

  getAllOpen: async (repoId, environment) => {
    const bounties = await prisma.bounty.findMany({
      where: {
        repoId: BigInt(repoId),
        status: 'open',
        environment: environment
      },
      orderBy: {
        amount: 'desc' // Show highest bounties first
      }
    });
    
    return bounties.map(b => ({
      ...b,
      repoId: Number(b.repoId),
      sponsorGithubId: b.sponsorGithubId ? Number(b.sponsorGithubId) : null,
      deadline: Number(b.deadline),
      createdAt: Number(b.createdAt),
      updatedAt: Number(b.updatedAt),
      pinnedCommentId: b.pinnedCommentId ? Number(b.pinnedCommentId) : null
    }));
  },

  findAllOpen: async () => {
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
    
    return bounties.map(b => ({
      ...b,
      repoId: Number(b.repoId),
      sponsorGithubId: b.sponsorGithubId ? Number(b.sponsorGithubId) : null,
      deadline: Number(b.deadline),
      createdAt: Number(b.createdAt),
      updatedAt: Number(b.updatedAt),
      pinnedCommentId: b.pinnedCommentId ? Number(b.pinnedCommentId) : null
    }));
  },

  findBySponsor: async (sponsorGithubId) => {
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
    
    return bounties.map(b => ({
      ...b,
      repoId: Number(b.repoId),
      sponsorGithubId: b.sponsorGithubId ? Number(b.sponsorGithubId) : null,
      deadline: Number(b.deadline),
      createdAt: Number(b.createdAt),
      updatedAt: Number(b.updatedAt),
      pinnedCommentId: b.pinnedCommentId ? Number(b.pinnedCommentId) : null
    }));
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

