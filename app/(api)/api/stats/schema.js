import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/stats';

const GetStatsResponseSchema = z.unknown();
registry.register('GetStatsResponse', GetStatsResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /stats',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetStatsResponseSchema,
        },
      },
    },
  },
});

