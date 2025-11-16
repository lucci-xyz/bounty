/**
 * Database query exports - Centralized access to all database operations
 */

export { initDB, prisma } from './client.js';

// Bounty queries
export {
  createBounty,
  findBountyById,
  findBountiesByIssue,
  updateBountyStatus,
  updateBountyPinnedComment,
  findExpiredBounties,
  findOpenBountiesByRepo,
  findAllOpenBounties,
  findBountiesBySponsor
} from './bountyQueries.js';

// Wallet queries
export {
  createOrUpdateWallet,
  findWalletByGithubId,
  findWalletByAddress,
  deleteWallet
} from './walletQueries.js';

// PR claim queries
export {
  createPRClaim,
  findPRClaimsByPR,
  updatePRClaimStatus,
  findPRClaimsByContributor
} from './prClaimQueries.js';

// User queries
export {
  upsertUser,
  findUserByGithubId,
  updateUserPreferences
} from './userQueries.js';

// Allowlist queries
export {
  createAllowlistEntry,
  findAllowlistByBounty,
  findAllowlistByRepo,
  checkAddressAllowed,
  removeAllowlistEntry
} from './allowlistQueries.js';

// Stats queries
export {
  getAllStats
} from './statsQueries.js';

// Legacy compatibility exports
export const bountyQueries = {
  create: (data) => import('./bountyQueries.js').then(m => m.createBounty(data)),
  findByIssue: (repoId, issueNumber) => import('./bountyQueries.js').then(m => m.findBountiesByIssue(repoId, issueNumber)),
  findById: (bountyId) => import('./bountyQueries.js').then(m => m.findBountyById(bountyId)),
  updateStatus: (bountyId, status, txHash) => import('./bountyQueries.js').then(m => m.updateBountyStatus(bountyId, status, txHash)),
  updatePinnedComment: (bountyId, commentId) => import('./bountyQueries.js').then(m => m.updateBountyPinnedComment(bountyId, commentId)),
  getExpired: () => import('./bountyQueries.js').then(m => m.findExpiredBounties()),
  getAllOpen: (repoId, environment) => import('./bountyQueries.js').then(m => m.findOpenBountiesByRepo(repoId, environment)),
  findAllOpen: () => import('./bountyQueries.js').then(m => m.findAllOpenBounties()),
  findBySponsor: (sponsorGithubId) => import('./bountyQueries.js').then(m => m.findBountiesBySponsor(sponsorGithubId))
};

export const walletQueries = {
  create: (githubId, githubUsername, walletAddress) => import('./walletQueries.js').then(m => m.createOrUpdateWallet(githubId, githubUsername, walletAddress)),
  findByGithubId: (githubId) => import('./walletQueries.js').then(m => m.findWalletByGithubId(githubId)),
  findByWallet: (walletAddress) => import('./walletQueries.js').then(m => m.findWalletByAddress(walletAddress)),
  delete: (githubId) => import('./walletQueries.js').then(m => m.deleteWallet(githubId))
};

export const prClaimQueries = {
  create: (bountyId, prNumber, prAuthorId, repoFullName) => import('./prClaimQueries.js').then(m => m.createPRClaim(bountyId, prNumber, prAuthorId, repoFullName)),
  findByPR: (repoFullName, prNumber) => import('./prClaimQueries.js').then(m => m.findPRClaimsByPR(repoFullName, prNumber)),
  updateStatus: (id, status, txHash, resolvedAt) => import('./prClaimQueries.js').then(m => m.updatePRClaimStatus(id, status, txHash, resolvedAt)),
  findByContributor: (prAuthorGithubId) => import('./prClaimQueries.js').then(m => m.findPRClaimsByContributor(prAuthorGithubId))
};

export const userQueries = {
  upsert: (githubData) => import('./userQueries.js').then(m => m.upsertUser(githubData)),
  findByGithubId: (githubId) => import('./userQueries.js').then(m => m.findUserByGithubId(githubId)),
  updatePreferences: (userId, preferences) => import('./userQueries.js').then(m => m.updateUserPreferences(userId, preferences))
};

export const allowlistQueries = {
  create: (userId, bountyId, repoId, allowedAddress) => import('./allowlistQueries.js').then(m => m.createAllowlistEntry(userId, bountyId, repoId, allowedAddress)),
  findByBounty: (bountyId) => import('./allowlistQueries.js').then(m => m.findAllowlistByBounty(bountyId)),
  findByRepo: (repoId, userId) => import('./allowlistQueries.js').then(m => m.findAllowlistByRepo(repoId, userId)),
  checkAllowed: (bountyId, address) => import('./allowlistQueries.js').then(m => m.checkAddressAllowed(bountyId, address)),
  remove: (id) => import('./allowlistQueries.js').then(m => m.removeAllowlistEntry(id))
};

export const statsQueries = {
  getAll: (limit) => import('./statsQueries.js').then(m => m.getAllStats(limit))
};
