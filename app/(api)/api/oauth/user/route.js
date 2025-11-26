import { getSession } from '@/shared/lib/session';
import { userQueries } from '@/shared/server/db/prisma';

export async function GET() {
  const session = await getSession();
  
  if (!session.githubId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Check database for user's custom avatar
  const user = await userQueries.findByGithubId(session.githubId);
  
  // Use database avatar if available, otherwise fall back to session avatar (from GitHub)
  const avatarUrl = user?.avatarUrl || session.avatarUrl || null;
  
  return Response.json({
    githubId: session.githubId,
    githubUsername: session.githubUsername,
    avatarUrl
  });
}

