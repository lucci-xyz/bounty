import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/health';

const GetHealthResponseSchema = z.unknown();
registry.register('GetHealthResponse', GetHealthResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /health',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetHealthResponseSchema,
        },
      },
    },
  },
});

