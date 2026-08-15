/**
 * Service to notify sponsors when their bounties expire
 * Can be triggered by a cron job or scheduled function
 */

import { logger } from '@/lib/logger';
import { bountyQueries, userQueries } from '@/server/db/prisma.js';
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
        // Idempotency comes from bounty.expiryNotifiedAt, which getExpired()
        // filters on — not from a time window.
        //
        // The previous approach only mailed bounties that had expired between 0
        // and 25 hours ago, on a cron that runs every 24. The one-hour overlap
        // guaranteed duplicate mail, and any run that failed or was delayed put
        // the bounty permanently out of range, so its sponsor was never told at
        // all. Both failures were silent.
        
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
          // Record the send so the next run skips this bounty. A failure to
          // record is logged but not fatal: at worst the sponsor gets one
          // duplicate, which is far better than dropping the notice entirely.
          try {
            await bountyQueries.markExpiryNotified(bounty.bountyId);
          } catch (markError) {
            logger.error(
              `[expirationNotifier] Sent notification for ${bounty.bountyId} but failed to record it:`,
              markError.message
            );
          }

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

