import { logger } from '@/lib/logger';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/auth/admin';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    logger.error('Error fetching beta applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

