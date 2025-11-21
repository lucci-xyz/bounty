import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/user/stats';

const GetUserStatsResponseSchema = z.unknown();
registry.register('GetUserStatsResponse', GetUserStatsResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /user/stats',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetUserStatsResponseSchema,
        },
      },
    },
  },
});

