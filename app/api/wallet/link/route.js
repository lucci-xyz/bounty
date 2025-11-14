import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';

export async function POST(request) {
  try {
    const session = await getSession();
    const { githubId, githubUsername, walletAddress } = await request.json();

    if (!githubId || !githubUsername || !walletAddress) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify wallet is authenticated in session
    if (session.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return Response.json({ error: 'Wallet not authenticated' }, { status: 401 });
    }

    // Store mapping
    await walletQueries.create(githubId, githubUsername, walletAddress);

    return Response.json({
      success: true,
      message: 'Wallet linked successfully'
    });
  } catch (error) {
    console.error('Error linking wallet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

