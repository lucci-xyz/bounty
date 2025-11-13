import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  
  console.log('👤 Checking authentication status');
  console.log('   GitHub ID:', session.githubId);
  console.log('   GitHub Username:', session.githubUsername);
  
  if (!session.githubId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  return Response.json({
    githubId: session.githubId,
    githubUsername: session.githubUsername
  });
}

