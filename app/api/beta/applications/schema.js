import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/beta/applications';

const GetBetaApplicationsResponseSchema = z.unknown();
registry.register('GetBetaApplicationsResponse', GetBetaApplicationsResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /beta/applications',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetBetaApplicationsResponseSchema,
        },
      },
    },
  },
});

