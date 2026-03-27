import { logger } from '@/lib/logger';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';
import { getLinkHref } from '@/config/links';
import { requireAdmin } from '@/server/auth/admin';

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { session } = auth;
    
    const { applicationId, action } = await request.json();
    
    if (!applicationId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
    // Update beta access status
    const updated = await prisma.betaAccess.update({
      where: { id: applicationId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: BigInt(Date.now()),
        reviewedBy: BigInt(session.githubId)
      }
    });
    
    // Send notification to user
    try {
      const notifyBaseUrl = process.env.FRONTEND_URL || getLinkHref('app', 'frontendLocal');
      await fetch(`${notifyBaseUrl}/api/beta/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          githubId: updated.githubId.toString(),
          status: updated.status
        })
      });
    } catch (notifyError) {
      logger.error('Failed to send notification:', notifyError);
      // Don't fail the whole request if notification fails
    }
    
    return NextResponse.json({
      success: true,
      application: {
        id: updated.id,
        githubId: updated.githubId.toString(),
        githubUsername: updated.githubUsername,
        status: updated.status,
        reviewedAt: updated.reviewedAt?.toString()
      }
    });
  } catch (error) {
    logger.error('Error reviewing beta application:', error);
    return NextResponse.json(
      { error: 'Failed to review application' },
      { status: 500 }
    );
  }
}

