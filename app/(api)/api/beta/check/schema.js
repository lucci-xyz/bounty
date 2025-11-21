import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/beta/check';

const GetBetaCheckResponseSchema = z.unknown();
registry.register('GetBetaCheckResponse', GetBetaCheckResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /beta/check',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetBetaCheckResponseSchema,
        },
      },
    },
  },
});

