import { randomBytes } from 'crypto';
import { getSession } from '@/shared/lib/session';
import { userQueries } from '@/shared/server/db/prisma';
import { sendEmailVerificationEmail } from '@/shared/server/notifications/email.js';
import { CONFIG } from '@/shared/server/config';
import { isValidEmail } from '@/shared/lib/validation';

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email || !isValidEmail(email.trim())) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userQueries.upsert({
      githubId: session.githubId,
      githubUsername: session.githubUsername,
      email: session.email,
      avatarUrl: session.avatarUrl
    });

    const token = randomBytes(32).toString('hex');
    const verification = await userQueries.createEmailVerification(
      user.id,
      normalizedEmail,
      token,
      Date.now() + VERIFICATION_EXPIRY_MS
    );

    await sendEmailVerificationEmail({
      to: normalizedEmail,
      username: user.githubUsername,
      token,
      frontendUrl: CONFIG.frontendUrl
    });

    return Response.json({
      success: true,
      email: verification.email,
      expiresAt: verification.expiresAt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

