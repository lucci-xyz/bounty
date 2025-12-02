import { CONFIG } from '@/shared/server/config';
import { userQueries } from '@/shared/server/db/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const successRedirect = `${CONFIG.frontendUrl}/account?emailVerified=success`;
    const failureRedirect = `${CONFIG.frontendUrl}/account?emailVerified=invalid`;

    if (!token) {
      return Response.redirect(failureRedirect);
    }

    const verification = await userQueries.findEmailVerificationByToken(token);
    if (!verification) {
      return Response.redirect(failureRedirect);
    }

    await userQueries.markEmailAsVerified(verification.id);
    return Response.redirect(successRedirect);
  } catch (error) {
    return Response.redirect(`${CONFIG.frontendUrl}/account?emailVerified=invalid`);
  }
}

