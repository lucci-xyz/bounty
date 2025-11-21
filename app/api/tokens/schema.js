import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/tokens';

const GetTokensResponseSchema = z.unknown();
registry.register('GetTokensResponse', GetTokensResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /tokens',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetTokensResponseSchema,
        },
      },
    },
  },
});

