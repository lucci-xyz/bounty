import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries } from '@/shared/server/db/prisma';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const bountyId = body?.bountyId;
    const txHash = body?.txHash || null;

    if (!bountyId) {
      return Response.json({ error: 'bountyId is required' }, { status: 400 });
    }

    const bounty = await bountyQueries.findById(bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }

    if (bounty.status === 'refunded') {
      return Response.json({ success: true, alreadyRefunded: true });
    }

    if (Number(bounty.sponsorGithubId) !== Number(session.githubId)) {
      return Response.json({ error: 'Not authorized to mark this bounty as refunded' }, { status: 403 });
    }

    const updated = await bountyQueries.updateStatus(bountyId, 'refunded', txHash || undefined);

    return Response.json({ success: true, bounty: updated });
  } catch (error) {
    logger.error('Error marking self refund:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

