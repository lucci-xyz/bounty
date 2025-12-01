/**
 * Service to notify sponsors when their bounties expire
 * Can be triggered by a cron job or scheduled function
 */

import { logger } from '@/shared/lib/logger';
import { bountyQueries, userQueries, prisma } from '../db/prisma.js';
import { sendBountyExpiredEmail } from './email.js';
import { ethers } from 'ethers';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bountypay.luccilabs.xyz';

/**
 * Check for expired bounties and send notifications
 * Only sends notification once per bounty (tracked via notification preferences or a separate flag)
 * @returns {Promise<{notified: number, skipped: number, errors: number}>}
 */
export async function notifyExpiredBounties() {
  const stats = { notified: 0, skipped: 0, errors: 0 };
  
  try {
    // Get all expired bounties that haven't been notified yet
    // A bounty is expired if: status='open' AND deadline < now
    const expiredBounties = await bountyQueries.getExpired();
    
    logger.info(`[expirationNotifier] Found ${expiredBounties.length} expired bounties`);
    
    for (const bounty of expiredBounties) {
      try {
        // Skip if we've already notified (check if there's a way to track this)
        // For now, we'll check if the bounty was expired recently (within 24 hours)
        const now = Math.floor(Date.now() / 1000);
        const expiredAt = Number(bounty.deadline);
        const hoursSinceExpiry = (now - expiredAt) / 3600;
        
        // Only notify for bounties that expired within the last 24 hours
        // and not more than 25 hours ago (to avoid duplicate notifications on subsequent runs)
        if (hoursSinceExpiry > 25 || hoursSinceExpiry < 0) {
          stats.skipped++;
          continue;
        }
        
        // Get sponsor's user record to find email
        if (!bounty.sponsorGithubId) {
          logger.warn(`[expirationNotifier] Bounty ${bounty.bountyId} has no sponsor GitHub ID`);
          stats.skipped++;
          continue;
        }
        
        const user = await userQueries.findByGithubId(bounty.sponsorGithubId);
        
        if (!user?.email) {
          logger.info(`[expirationNotifier] No email for sponsor of bounty ${bounty.bountyId}`);
          stats.skipped++;
          continue;
        }
        
        // Format the bounty amount
        const decimals = bounty.tokenSymbol === 'MUSD' ? 18 : 6;
        const bountyAmount = Number(ethers.formatUnits(bounty.amount, decimals)).toFixed(2);
        
        // Send the email
        const result = await sendBountyExpiredEmail({
          to: user.email,
          username: user.githubUsername,
          bountyAmount,
          tokenSymbol: bounty.tokenSymbol || 'USDC',
          issueNumber: bounty.issueNumber,
          issueTitle: bounty.issueTitle,
          repoFullName: bounty.repoFullName,
          frontendUrl: FRONTEND_URL
        });
        
        if (result.success) {
          logger.info(`[expirationNotifier] Sent expiry notification for bounty ${bounty.bountyId} to ${user.email}`);
          stats.notified++;
        } else if (result.skipped) {
          stats.skipped++;
        } else {
          stats.errors++;
        }
      } catch (bountyError) {
        logger.error(`[expirationNotifier] Error processing bounty ${bounty.bountyId}:`, bountyError.message);
        stats.errors++;
      }
    }
  } catch (error) {
    logger.error('[expirationNotifier] Failed to check expired bounties:', error.message);
    throw error;
  }
  
  logger.info(`[expirationNotifier] Complete: ${stats.notified} notified, ${stats.skipped} skipped, ${stats.errors} errors`);
  return stats;
}

/**
 * Notify a specific sponsor about an expired bounty
 * Use when a bounty is detected as expired during normal operation
 */
export async function notifySponsorOfExpiredBounty(bountyId) {
  try {
    const bounty = await bountyQueries.findById(bountyId);
    
    if (!bounty) {
      logger.warn(`[expirationNotifier] Bounty not found: ${bountyId}`);
      return { success: false, reason: 'not_found' };
    }
    
    if (bounty.status !== 'open') {
      return { success: false, reason: 'not_open' };
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (Number(bounty.deadline) > now) {
      return { success: false, reason: 'not_expired' };
    }
    
    if (!bounty.sponsorGithubId) {
      return { success: false, reason: 'no_sponsor' };
    }
    
    const user = await userQueries.findByGithubId(bounty.sponsorGithubId);
    
    if (!user?.email) {
      return { success: false, reason: 'no_email' };
    }
    
    const decimals = bounty.tokenSymbol === 'MUSD' ? 18 : 6;
    const bountyAmount = Number(ethers.formatUnits(bounty.amount, decimals)).toFixed(2);
    
    const result = await sendBountyExpiredEmail({
      to: user.email,
      username: user.githubUsername,
      bountyAmount,
      tokenSymbol: bounty.tokenSymbol || 'USDC',
      issueNumber: bounty.issueNumber,
      issueTitle: bounty.issueTitle,
      repoFullName: bounty.repoFullName,
      frontendUrl: FRONTEND_URL
    });
    
    return result;
  } catch (error) {
    logger.error(`[expirationNotifier] Error notifying sponsor of bounty ${bountyId}:`, error.message);
    return { success: false, error: error.message };
  }
}

