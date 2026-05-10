import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';

// Links the SIWE-verified wallet in the session to the OAuth-verified GitHub
// identity in the session. Inputs are taken exclusively from the session —
// the request body is ignored — so a caller cannot link a wallet to anyone
// else's GitHub account or overwrite another user's wallet mapping.
export async function POST() {
  try {
    const session = await getSession();

    if (!session.githubId || !session.githubUsername) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.walletAddress) {
      return Response.json({ error: 'Wallet not authenticated' }, { status: 401 });
    }

    await walletQueries.create(
      session.githubId,
      session.githubUsername,
      session.walletAddress
    );

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Error linking wallet:', error);
    return Response.json({ error: 'Failed to link wallet' }, { status: 500 });
  }
}
