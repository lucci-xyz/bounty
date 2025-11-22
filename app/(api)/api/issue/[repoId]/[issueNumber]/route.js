import { logger } from '@/shared/lib/logger';
import './schema';
import { bountyQueries } from '@/shared/server/db/prisma';

export async function GET(request, { params }) {
  try {
    const { repoId, issueNumber } = await params;
    const bounties = await bountyQueries.findByIssue(parseInt(repoId), parseInt(issueNumber));

    return Response.json({ bounties });
  } catch (error) {
    logger.error('Error fetching issue bounties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

