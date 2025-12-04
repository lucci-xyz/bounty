import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { SiweMessage } from 'siwe';

export async function POST(request) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return Response.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    const session = await getSession();
    
    // Parse the SIWE message
    let siweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch (parseError) {
      logger.error('Failed to parse SIWE message:', parseError.message);
      return Response.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // Verify the signature with nonce validation
    try {
      const verifyParams = { signature };
      
      // Add nonce validation if we have one stored in session
      if (session.siweNonce) {
        verifyParams.nonce = session.siweNonce;
      }
      
      const { data: fields } = await siweMessage.verify(verifyParams);

      // Store wallet in session
      session.walletAddress = fields.address;
      session.chainId = fields.chainId;
      session.siweNonce = null; // Clear used nonce
      await session.save();

      logger.info('Wallet verified successfully:', fields.address);

      return Response.json({
        success: true,
        address: fields.address
      });
    } catch (verifyError) {
      logger.error('SIWE verification failed:', verifyError.message);
      return Response.json({ error: verifyError.message || 'Invalid signature' }, { status: 401 });
    }
  } catch (error) {
    logger.error('Error verifying wallet:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
