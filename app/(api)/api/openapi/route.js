import './schema';
import { getOpenApiDocument } from '@/shared/lib/openapi/registry';
import '@/shared/lib/openapi/register-schemas';

export function GET() {
  const document = getOpenApiDocument();
  return Response.json(document, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}


