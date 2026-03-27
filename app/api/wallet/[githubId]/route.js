import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { githubId } = await params;
    const parsedId = parseInt(githubId);
    if (Number.isNaN(parsedId)) {
      return Response.json({ error: 'Invalid GitHub ID' }, { status: 400 });
    }

    const mapping = await walletQueries.findByGithubId(parsedId);

    if (!mapping) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return Response.json(mapping);
  } catch (error) {
    logger.error('Error fetching wallet:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

