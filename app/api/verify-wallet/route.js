import './schema';
import { getSession } from '@/lib/session';
import { verifySIWE } from '@/server/auth/siwe';

export async function POST(request) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return Response.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    // Verify the signature
    const result = await verifySIWE(message, signature);

    if (!result.success) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Store wallet in session
    const session = await getSession();
    session.walletAddress = result.address;
    session.chainId = result.chainId;
    await session.save();

    return Response.json({
      success: true,
      address: result.address
    });
  } catch (error) {
    console.error('Error verifying wallet:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}

