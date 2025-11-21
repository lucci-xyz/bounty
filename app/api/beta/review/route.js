import './schema';
import { getSession } from '@/lib/session';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';

// List of admin GitHub IDs - configure in environment
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id)
  .map(id => BigInt(id));

export async function POST(request) {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    if (!ADMIN_GITHUB_IDS.includes(BigInt(session.githubId))) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
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
      await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/beta/notify`, {
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
      console.error('Failed to send notification:', notifyError);
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
    console.error('Error reviewing beta application:', error);
    return NextResponse.json(
      { error: 'Failed to review application' },
      { status: 500 }
    );
  }
}

