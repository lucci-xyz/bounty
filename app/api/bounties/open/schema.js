import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/bounties/open';

const GetBountiesOpenResponseSchema = z.unknown();
registry.register('GetBountiesOpenResponse', GetBountiesOpenResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /bounties/open',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetBountiesOpenResponseSchema,
        },
      },
    },
  },
});

