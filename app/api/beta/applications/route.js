import { getSession } from '@/lib/session';
import { prisma } from '@/server/db/prisma';
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
    
    // Get all beta access applications
    const applications = await prisma.betaAccess.findMany({
      orderBy: [
        { status: 'asc' }, // pending first
        { appliedAt: 'desc' }
      ]
    });
    
    return NextResponse.json({
      applications: applications.map(app => ({
        id: app.id,
        githubId: app.githubId.toString(),
        githubUsername: app.githubUsername,
        email: app.email,
        status: app.status,
        appliedAt: app.appliedAt.toString(),
        reviewedAt: app.reviewedAt?.toString(),
        reviewedBy: app.reviewedBy?.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching beta applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

