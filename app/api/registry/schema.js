import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/registry';

const GetRegistryResponseSchema = z.unknown();
registry.register('GetRegistryResponse', GetRegistryResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /registry',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetRegistryResponseSchema,
        },
      },
    },
  },
});

