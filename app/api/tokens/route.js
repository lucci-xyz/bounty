import { CONFIG } from '@/server/config';

export async function GET() {
  return Response.json(CONFIG.tokens);
}
