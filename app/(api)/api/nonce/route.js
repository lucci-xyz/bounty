import './schema';
import { getSession } from '@/shared/lib/session';
import { generateNonce } from '@/shared/server/auth/siwe';

export async function GET() {
  const session = await getSession();
  const nonce = generateNonce();
  session.siweNonce = nonce;
  await session.save();
  
  return Response.json({ nonce });
}

