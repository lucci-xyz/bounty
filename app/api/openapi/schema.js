import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/openapi';

const GetOpenapiResponseSchema = z.unknown();
registry.register('GetOpenapiResponse', GetOpenapiResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /openapi',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetOpenapiResponseSchema,
        },
      },
    },
  },
});

