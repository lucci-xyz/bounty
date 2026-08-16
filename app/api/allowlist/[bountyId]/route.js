import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { allowlistQueries, bountyQueries, userQueries } from '@/server/db/prisma';
import { ethers } from 'ethers';

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { bountyId } = await params;
    
    // Verify user owns this bounty
    const bounty = await bountyQueries.findById(bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }
    
    if (bounty.sponsorGithubId !== session.githubId) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const allowlist = await allowlistQueries.findByBounty(bountyId);
    
    return Response.json(allowlist);
  } catch (error) {
    logger.error('Error fetching allowlist:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { bountyId } = await params;
    const { address } = await request.json();
    
    // Validate address
    if (!ethers.isAddress(address)) {
      return Response.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }
    
    // Verify user owns this bounty
    const bounty = await bountyQueries.findById(bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }
    
    if (bounty.sponsorGithubId !== session.githubId) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get or create user
    let user = await userQueries.findByGithubId(session.githubId);
    if (!user) {
      user = await userQueries.upsert({
        githubId: session.githubId,
        githubUsername: session.githubUsername,
        email: session.email,
        avatarUrl: session.avatarUrl
      });
    }
    
    // Add to allowlist
    const entry = await allowlistQueries.create(user.id, bountyId, null, address);
    
    return Response.json(entry);
  } catch (error) {
    logger.error('Error adding to allowlist:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { bountyId } = await params;
    const { allowlistId } = await request.json();
    
    // Verify user owns this bounty
    const bounty = await bountyQueries.findById(bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }
    
    if (bounty.sponsorGithubId !== session.githubId) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Scope the delete to the bounty the caller was authorised against.
    // Deleting by the body's allowlistId alone was an IDOR: owning any one
    // bounty let a caller delete every other sponsor's allowlist entries,
    // silently widening who their bounties could pay.
    const { success } = await allowlistQueries.remove(Number(allowlistId), bountyId);

    if (!success) {
      return Response.json({ error: 'Allowlist entry not found for this bounty' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Error removing from allowlist:', error);
    return Response.json({ error: 'Failed to remove allowlist entry' }, { status: 500 });
  }
}

