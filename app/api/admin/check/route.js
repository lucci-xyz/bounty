import './schema';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';

// List of admin GitHub IDs - configure in environment
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id)
  .map(id => BigInt(id));

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json({ isAdmin: false });
    }
    
    const isAdmin = ADMIN_GITHUB_IDS.includes(BigInt(session.githubId));
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
}

