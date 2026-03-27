import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';
import { getWalletLinkPayload } from '@/server/auth/walletLink';

export async function POST(request) {
  try {
    const session = await getSession();
    const body = await request.json().catch(() => ({}));
    const { githubId, githubUsername, walletAddress } = getWalletLinkPayload(session, body);

    // Store mapping
    await walletQueries.create(githubId, githubUsername, walletAddress);

    return Response.json({
      success: true,
      message: 'Wallet linked successfully'
    });
  } catch (error) {
    logger.error('Error linking wallet:', error);
    const status = error.message === 'Wallet not authenticated' ? 401 : 400;
    return Response.json({ error: status === 401 ? 'Wallet not authenticated' : 'Wallet linking failed' }, { status });
  }
}
