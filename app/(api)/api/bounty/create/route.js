import { logger } from '@/shared/lib/logger';
import { cookies } from 'next/headers';
import { getSession } from '@/shared/lib/session';
import { bountyQueries, userQueries } from '@/shared/server/db/prisma';
import { handleBountyCreated } from '@/shared/server/github/webhooks';
import { computeBountyIdOnNetwork, createRepoIdHash } from '@/shared/server/blockchain/contract';
import { getGitHubApp, getOctokit, initGitHubApp } from '@/shared/server/github/client';
import { getActiveAliasFromCookies } from '@/shared/lib/network';
import { REGISTRY } from '@/shared/config/chain-registry';

export async function POST(request) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    
    // Get active network alias from cookie (or use provided one)
    const defaultAlias = getActiveAliasFromCookies(cookieStore);
    
    const body = await request.json();

    const {
      repoFullName,
      repoId,
      issueNumber,
      sponsorAddress,
      token,
      amount,
      deadline,
      txHash,
      installationId,
      network,
      tokenSymbol
    } = body;

    // Use provided network or default from cookie
    const alias = network || defaultAlias;
    
    logger.info('Creating bounty with network alias:', alias);
    logger.info('Received network param:', network);
    logger.info('Default alias from cookie:', defaultAlias);
    
    const networkConfig = REGISTRY[alias];
    
    if (!networkConfig) {
      throw new Error(`Invalid network alias: ${alias}`);
    }

    // Compute bountyId
    const repoIdHash = createRepoIdHash(repoId);
    const bountyId = await computeBountyIdOnNetwork(sponsorAddress, repoIdHash, issueNumber, alias);

    // Derive chainId and token info from network config
    const chainId = networkConfig.chainId;
    const tokenAddress = token || networkConfig.token.address;
    const tokenSymbolFinal = tokenSymbol || networkConfig.token.symbol;

    // Auto-create or update user if session exists (backward compatible)
    if (session && session.githubId) {
      try {
        await userQueries.upsert({
          githubId: session.githubId,
          githubUsername: session.githubUsername,
          email: session.email,
          avatarUrl: session.avatarUrl
        });
      } catch (userError) {
        logger.warn('Failed to upsert user (non-critical):', userError.message);
        // Don't fail the request if user creation fails
      }
    }

    let issueTitle = null;
    let issueDescription = null;

    if (installationId && installationId > 0 && repoFullName) {
      try {
        try {
          getGitHubApp();
        } catch {
          logger.info('Initializing GitHub App...');
          initGitHubApp();
        }

        const octokit = await getOctokit(installationId);
        const [owner, repo] = repoFullName.split('/');

        const { data: issue } = await octokit.rest.issues.get({
          owner,
          repo,
          issue_number: issueNumber
        });

        issueTitle = issue.title;
        issueDescription = issue.body;
      } catch (issueError) {
        logger.warn('Failed to fetch issue metadata (non-critical):', issueError.message);
      }
    }

    // Store in database
    await bountyQueries.create({
      bountyId,
      repoFullName,
      repoId,
      issueNumber,
      issueTitle,
      issueDescription,
      sponsorAddress,
      sponsorGithubId: session.githubId || null,
      token: tokenAddress,
      amount,
      deadline,
      status: 'open',
      txHash,
      network: alias,
      chainId,
      tokenSymbol: tokenSymbolFinal
    });

    // Post GitHub comment (skip in local mode or if no installation)
    if (installationId && installationId > 0) {
      try {
        // Initialize GitHub App if needed
        try {
          getGitHubApp();
        } catch {
          logger.info('Initializing GitHub App...');
          initGitHubApp();
        }

        await handleBountyCreated({
          repoFullName,
          issueNumber,
          bountyId,
          amount,
          deadline,
          sponsorAddress,
          txHash,
          installationId,
          network: alias,
          tokenSymbol: tokenSymbolFinal
        });
      } catch (githubError) {
        logger.warn('Failed to post GitHub comment (non-critical):', githubError.message);
        // Don't fail the entire request if GitHub comment fails
      }
    } else {
      logger.info('Skipping GitHub comment (no installation ID)');
    }

    return Response.json({
      success: true,
      bountyId
    });
  } catch (error) {
    logger.error('Error creating bounty:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

