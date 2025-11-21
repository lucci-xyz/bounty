import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/admin/check';

const GetAdminCheckResponseSchema = z.unknown();
registry.register('GetAdminCheckResponse', GetAdminCheckResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /admin/check',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetAdminCheckResponseSchema,
        },
      },
    },
  },
});

