import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { NextResponse } from 'next/server';
import { isAdminGithubId } from '@/shared/server/auth/admin';

/**
 * GET /api/admin/check
 * Returns whether the current user has admin access.
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.githubId) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = isAdminGithubId(session.githubId);
    return NextResponse.json({ isAdmin });
  } catch (error) {
    logger.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
