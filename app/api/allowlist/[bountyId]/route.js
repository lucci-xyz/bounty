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
    console.error('Error fetching allowlist:', error);
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
    console.error('Error adding to allowlist:', error);
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
    
    await allowlistQueries.remove(allowlistId);
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error removing from allowlist:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

