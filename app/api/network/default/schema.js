import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/network/default';

const GetNetworkDefaultResponseSchema = z.unknown();
registry.register('GetNetworkDefaultResponse', GetNetworkDefaultResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /network/default',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetNetworkDefaultResponseSchema,
        },
      },
    },
  },
});

