import { getSession } from '@/lib/session';
import { userQueries, walletQueries } from '@/server/db/prisma';

export async function GET(request) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await userQueries.findByGithubId(session.githubId);
    const wallet = await walletQueries.findByGithubId(session.githubId);
    
    return Response.json({
      user: user || {
        githubId: session.githubId,
        githubUsername: session.githubUsername,
        avatarUrl: session.avatarUrl
      },
      wallet
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { preferences } = await request.json();
    
    let user = await userQueries.findByGithubId(session.githubId);
    
    if (!user) {
      // Create user if doesn't exist
      user = await userQueries.upsert({
        githubId: session.githubId,
        githubUsername: session.githubUsername,
        email: session.email,
        avatarUrl: session.avatarUrl
      });
    }
    
    const updated = await userQueries.updatePreferences(user.id, preferences);
    
    return Response.json(updated);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

