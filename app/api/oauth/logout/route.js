import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Logout failed' }, { status: 500 });
  }
}

