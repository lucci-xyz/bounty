import './schema';
import { getSession } from '@/lib/session';
import { generateNonce } from '@/server/auth/siwe';

export async function GET() {
  const session = await getSession();
  const nonce = generateNonce();
  session.siweNonce = nonce;
  await session.save();
  
  return Response.json({ nonce });
}

