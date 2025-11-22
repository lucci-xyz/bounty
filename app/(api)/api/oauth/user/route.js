import { getSession } from '@/shared/lib/session';

export async function GET() {
  const session = await getSession();
  
  if (!session.githubId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  return Response.json({
    githubId: session.githubId,
    githubUsername: session.githubUsername
  });
}

