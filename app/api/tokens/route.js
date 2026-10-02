import { CONFIG } from '@/server/config';

export function GET() {
  return Response.json(CONFIG.tokens);
}
