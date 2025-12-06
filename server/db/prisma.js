import { logger } from '@/lib/logger';
import { PrismaClient, Prisma } from '@prisma/client';
import { CONFIG } from '../config.js';
import { isValidStatus, BOUNTY_STATUS } from '@/lib/status';

// Prisma client instance
const prisma = new PrismaClient();

/**
 * Connects to the database.
 */
export async function initDB() {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Failed to connect to database:', error.message);
    throw error;
  }
}

let hasIssueMetadataColumns;

/**
 * Checks if issue metadata columns exist in the bounties table.
 * @returns {Promise<boolean>}
 */
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

/**
 * Returns the select fields for bounty queries, including issue metadata if supported.
 */
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

/**
 * Converts bounty fields from BigInt to Number where needed.
 * @param {object} bounty
 * @returns {object|null}
 */
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

/**
 * Provides methods for bounty database operations.
 */
export const bountyQueries = {
  /**
   * Creates a new bounty.
   * @param {object} bountyData
   * @returns {Promise<object>}
   */
  create: async (bountyData) => {
    const environment = CONFIG.envTarget || 'stage';
    const includeIssueMetadata = await supportsIssueMetadata();
    const bountySelect = await getBountySelect();
    
    if (!bountyData.network) throw new Error('Network alias is required to create bounty');
    if (!bountyData.chainId) throw new Error('Chain ID is required to create bounty');
    if (!bountyData.tokenSymbol) throw new Error('Token symbol is required to create bounty');
    
    const status = bountyData.status || BOUNTY_STATUS.OPEN;
    if (!isValidStatus(status)) {
      throw new Error(`Invalid bounty status: ${status}. Valid: open, resolved, refunded`);
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
      status,
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

  /**
   * Finds open bounties by repo and issue number.
   * @param {string|number} repoId 
   * @param {number} issueNumber 
   * @returns {Promise<Array>}
   */
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

  /**
   * Finds a bounty by its ID.
   * @param {string} bountyId 
   * @returns {Promise<object|null>}
   */
  findById: async (bountyId) => {
    const bountySelect = await getBountySelect();
    const bounty = await prisma.bounty.findUnique({
      where: { bountyId },
      select: bountySelect
    });
    
    return normalizeBounty(bounty);
  },

  /**
   * Updates the status and txHash of a bounty.
   * @param {string} bountyId 
   * @param {string} status 
   * @param {string|null} txHash 
   * @returns {Promise<object>}
   */
  updateStatus: async (bountyId, status, txHash = null) => {
    if (!isValidStatus(status)) {
      throw new Error(`Invalid bounty status: ${status}. Valid: open, resolved, refunded`);
    }
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

  /**
   * Updates the pinned comment ID for a bounty.
   * @param {string} bountyId 
   * @param {string|number} commentId 
   * @returns {Promise<object>}
   */
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

  /**
   * Gets expired open bounties.
   * @returns {Promise<Array>}
   */
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

  /**
   * Gets all open bounties for a specific repo and environment.
   * @param {string|number} repoId 
   * @param {string} environment 
   * @returns {Promise<Array>}
   */
  getAllOpen: async (repoId, environment) => {
    const bountySelect = await getBountySelect();
    const bounties = await prisma.bounty.findMany({
      where: {
        repoId: BigInt(repoId),
        status: 'open',
        environment: environment
      },
      orderBy: {
        amount: 'desc'
      },
      select: bountySelect
    });
    
    return bounties.map(normalizeBounty);
  },

  /**
   * Finds all open bounties in the current environment.
   * @returns {Promise<Array>}
   */
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

  /**
   * Finds bounties by sponsor Github ID.
   * @param {string|number} sponsorGithubId 
   * @returns {Promise<Array>}
   */
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

/**
 * Provides methods for wallet address mapping queries.
 */
export const walletQueries = {
  /**
   * Creates or updates a wallet mapping for a github user.
   */
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

  /**
   * Finds a wallet mapping by Github ID.
   */
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

  /**
   * Finds a wallet mapping by wallet address.
   */
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

  /**
   * Deletes a wallet mapping by Github ID.
   */
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

/**
 * Provides methods for PR claim queries.
 */
export const prClaimQueries = {
  /**
   * Creates a PR claim.
   */
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

  /**
   * Finds PR claims by repo and PR number.
   */
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

  /**
   * Updates the status and optionally txHash/resolvedAt of a PR claim.
   */
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

  /**
   * Finds PR claims by PR author Github ID.
   */
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

  /**
   * Finds a PR claim by its ID.
   */
  findById: async (id) => {
    const claim = await prisma.prClaim.findUnique({
      where: { id }
    });

    if (!claim) return null;

    return {
      ...claim,
      prAuthorGithubId: Number(claim.prAuthorGithubId),
      createdAt: Number(claim.createdAt),
      resolvedAt: claim.resolvedAt ? Number(claim.resolvedAt) : null
    };
  },

  /**
   * Counts PR claims for a list of bounty IDs.
   * @param {Array} bountyIds 
   * @returns {Promise<object>}
   */
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
  },

  /**
   * Counts unique contributors who were paid for a list of resolved bounty IDs.
   * Uses efficient groupBy at database level - groups by contributor and counts groups.
   * @param {Array<string>} resolvedBountyIds - Array of resolved bounty IDs
   * @returns {Promise<number>} Number of unique contributors who were paid
   */
  countUniquePaidContributors: async (resolvedBountyIds = []) => {
    if (!Array.isArray(resolvedBountyIds) || resolvedBountyIds.length === 0) {
      return 0;
    }

    // Use groupBy to get unique contributors - database does the grouping efficiently
    const uniqueContributorGroups = await prisma.prClaim.groupBy({
      by: ['prAuthorGithubId'],
      where: {
        bountyId: {
          in: resolvedBountyIds
        },
        status: {
          in: ['paid', 'resolved']
        }
      }
    });

    return uniqueContributorGroups.length;
  }
};

/**
 * Provides queries for analytics and statistics.
 */
export const statsQueries = {
  /**
   * Returns token stats and recent activities.
   * @param {number} [limit=20]
   * @returns {Promise<object>}
   */
  getAll: async (limit = 20) => {
    const environment = CONFIG.envTarget || 'stage';

    // Get token statistics
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

    // Get recent bounties
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

    // Calculate total TVL
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

    // Convert BigInt fields to numbers
    const recentConverted = recent.map(r => ({
      ...r,
      createdAt: Number(r.createdAt)
    }));

    return { tokenStats, recent: recentConverted, overall };
  }
};

/**
 * Provides queries for user management.
 */
export const userQueries = {
  /**
   * Creates or updates a user record from Github data.
   */
  upsert: async (githubData) => {
    const user = await prisma.user.upsert({
      where: { githubId: BigInt(githubData.githubId) },
      update: {
        // Only update GitHub-sourced fields; never overwrite verified email
        githubUsername: githubData.githubUsername,
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

  /**
   * Finds a user by Github ID.
   */
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

  /**
   * Updates user preferences.
   */
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
,
  /**
   * Creates an email verification record for the given user/email.
   */
  createEmailVerification: async (userId, email, token, expiresAt) => {
    const verification = await prisma.emailVerification.create({
      data: {
        userId,
        email,
        token,
        expiresAt: BigInt(expiresAt),
        createdAt: BigInt(Date.now())
      }
    });
    
    return {
      ...verification,
      userId: Number(verification.userId),
      expiresAt: Number(verification.expiresAt),
      createdAt: Number(verification.createdAt),
      verifiedAt: verification.verifiedAt ? Number(verification.verifiedAt) : null
    };
  },
  /**
   * Finds the latest pending email verification that has not expired.
   */
  findLatestPendingEmailVerification: async (userId) => {
    const now = BigInt(Date.now());
    const verification = await prisma.emailVerification.findFirst({
      where: {
        userId,
        verifiedAt: null,
        expiresAt: {
          gt: now
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!verification) return null;
    
    return {
      ...verification,
      userId: Number(verification.userId),
      expiresAt: Number(verification.expiresAt),
      createdAt: Number(verification.createdAt),
      verifiedAt: verification.verifiedAt ? Number(verification.verifiedAt) : null
    };
  },
  /**
   * Finds a verification record by token if still valid.
   */
  findEmailVerificationByToken: async (token) => {
    const verification = await prisma.emailVerification.findUnique({
      where: { token }
    });
    
    if (
      !verification ||
      verification.verifiedAt ||
      Number(verification.expiresAt) <= Date.now()
    ) {
      return null;
    }
    
    return {
      ...verification,
      userId: Number(verification.userId),
      expiresAt: Number(verification.expiresAt),
      createdAt: Number(verification.createdAt),
      verifiedAt: verification.verifiedAt ? Number(verification.verifiedAt) : null
    };
  },
  /**
   * Marks a verification record as consumed and updates the user's email.
   */
  markEmailAsVerified: async (verificationId) => {
    const now = BigInt(Date.now());
    const verification = await prisma.emailVerification.findUnique({
      where: { id: verificationId }
    });
    
    if (!verification) {
      throw new Error('Email verification not found');
    }
    
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verificationId },
        data: { verifiedAt: now }
      }),
      prisma.user.update({
        where: { id: verification.userId },
        data: {
          email: verification.email,
          updatedAt: now
        }
      })
    ]);

    const user = await prisma.user.findUnique({ where: { id: verification.userId } });
    return {
      ...user,
      githubId: Number(user.githubId),
      createdAt: Number(user.createdAt),
      updatedAt: Number(user.updatedAt)
    };
  }
};

/**
 * Provides queries for bounty allowlist management.
 */
export const allowlistQueries = {
  /**
   * Creates an allowlist entry for a user/repo/bounty.
   */
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

  /**
   * Finds allowlist entries by bounty ID.
   */
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

  /**
   * Finds allowlist entries for a user on a specific repo.
   */
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

  /**
   * Checks if an address is allowed for a bounty.
   */
  checkAllowed: async (bountyId, address) => {
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
  },

  /**
   * Removes an allowlist entry by ID.
   */
  remove: async (id) => {
    await prisma.allowlist.delete({
      where: { id }
    });
    return { success: true };
  }
};

/**
 * Exports the Prisma client instance.
 */
export { prisma };
