import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';

/**
 * GET /api/wallet/[githubId]
 *
 * Returns the caller's own wallet mapping.
 *
 * This endpoint was previously unauthenticated, which turned it into a public
 * GitHub-ID -> wallet-address oracle: anyone could walk GitHub IDs and build a
 * map of identities to on-chain addresses for every user of the product. It is
 * now restricted to the authenticated caller's own mapping.
 *
 * NOTE: this route currently has no callers in the application. Deleting it
 * outright is preferable to keeping a redundant surface.
 */
export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { githubId } = await params;
    const requested = Number.parseInt(githubId, 10);

    if (!Number.isInteger(requested)) {
      return Response.json({ error: 'Invalid GitHub ID' }, { status: 400 });
    }

    // A caller may only read their own mapping — never another user's.
    if (requested !== Number(session.githubId)) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    const mapping = await walletQueries.findByGithubId(requested);

    if (!mapping) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return Response.json(mapping);
  } catch (error) {
    logger.error('Error fetching wallet:', error);
    return Response.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}
