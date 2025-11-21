import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/nonce';

const GetNonceResponseSchema = z.unknown();
registry.register('GetNonceResponse', GetNonceResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /nonce',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetNonceResponseSchema,
        },
      },
    },
  },
});

