import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/resolver';

const GetResolverResponseSchema = z.unknown();
registry.register('GetResolverResponse', GetResolverResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /resolver',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetResolverResponseSchema,
        },
      },
    },
  },
});

