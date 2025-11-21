import './schema';
import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';

export async function DELETE(request) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { confirmation } = await request.json();
    
    // Verify user typed the confirmation phrase
    if (confirmation?.toLowerCase() !== 'i want to remove my wallet') {
      return Response.json({ error: 'Invalid confirmation phrase' }, { status: 400 });
    }

    // Check if wallet exists
    const wallet = await walletQueries.findByGithubId(session.githubId);
    if (!wallet) {
      return Response.json({ error: 'No wallet found to delete' }, { status: 404 });
    }

    // Delete the wallet
    await walletQueries.delete(session.githubId);
    
    return Response.json({ success: true, message: 'Wallet deleted successfully' });
  } catch (error) {
    console.error('Error deleting wallet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

