import './schema';
import { getOpenApiDocument } from '@/lib/openapi/registry';
import '@/lib/openapi/register-schemas';

export function GET() {
  const document = getOpenApiDocument();
  return Response.json(document, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}


