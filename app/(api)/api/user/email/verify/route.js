import { CONFIG } from '@/shared/server/config';
import { userQueries } from '@/shared/server/db/prisma';
import { logger } from '@/shared/lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const successUrl = new URL('/app/account', CONFIG.frontendUrl);
    successUrl.searchParams.set('emailVerified', 'success');

    const failureUrl = new URL('/app/account', CONFIG.frontendUrl);
    failureUrl.searchParams.set('emailVerified', 'invalid');

    if (!token) {
      logger.warn('Email verification attempt without token');
      return Response.redirect(failureUrl.toString());
    }

    const verification = await userQueries.findEmailVerificationByToken(token);
    if (!verification) {
      logger.warn('Email verification token not found or expired', { token: token.slice(0, 8) + '...' });
      return Response.redirect(failureUrl.toString());
    }

    logger.info('Verifying email', { 
      verificationId: verification.id, 
      userId: verification.userId,
      email: verification.email 
    });
    
    const updatedUser = await userQueries.markEmailAsVerified(verification.id);
    
    logger.info('Email verified successfully', { 
      userId: updatedUser.id, 
      email: updatedUser.email,
      githubUsername: updatedUser.githubUsername
    });
    
    return Response.redirect(successUrl.toString());
  } catch (error) {
    logger.error('Email verification error', { error: error.message, stack: error.stack });
    const fallbackFailureUrl = new URL('/app/account', CONFIG.frontendUrl);
    fallbackFailureUrl.searchParams.set('emailVerified', 'invalid');
    return Response.redirect(fallbackFailureUrl.toString());
  }
}

