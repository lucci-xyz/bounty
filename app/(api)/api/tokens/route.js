import './schema';
import { CONFIG } from '@/shared/server/config';

export async function GET() {
  return Response.json(CONFIG.tokens);
}
