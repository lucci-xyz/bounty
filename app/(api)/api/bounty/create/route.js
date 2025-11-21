import { cookies } from 'next/headers';
import { getSession } from '@/shared/lib/session';
import { bountyQueries, userQueries } from '@/shared/server/db/prisma';
import { handleBountyCreated } from '@/shared/server/github/webhooks';
import { computeBountyIdOnNetwork, createRepoIdHash } from '@/shared/server/blockchain/contract';
import { getGitHubApp, getOctokit, initGitHubApp } from '@/shared/server/github/client';
import { getActiveAliasFromCookies } from '@/shared/lib/network-env';
import { REGISTRY } from '@/config/chain-registry';
import { CreateBountyBodySchema } from './schema';

export async function POST(request) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    
    // Get active network alias from cookie (or use provided one)
    const defaultAlias = getActiveAliasFromCookies(cookieStore);
    
    const body = CreateBountyBodySchema.parse(await request.json());

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
    
    console.log('📡 Creating bounty with network alias:', alias);
    console.log('📦 Received network param:', network);
    console.log('🔧 Default alias from cookie:', defaultAlias);
    
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
        console.warn('Failed to upsert user (non-critical):', userError.message);
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
          console.log('📱 Initializing GitHub App...');
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
        console.warn('⚠️ Failed to fetch issue metadata (non-critical):', issueError.message);
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
          console.log('📱 Initializing GitHub App...');
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
        console.warn('⚠️ Failed to post GitHub comment (non-critical):', githubError.message);
        // Don't fail the entire request if GitHub comment fails
      }
    } else {
      console.log('⏭️ Skipping GitHub comment (no installation ID)');
    }

    return Response.json({
      success: true,
      bountyId
    });
  } catch (error) {
    console.error('Error creating bounty:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

