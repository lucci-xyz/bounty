import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/user/claimed-bounties';

const GetUserClaimedBountiesResponseSchema = z.unknown();
registry.register('GetUserClaimedBountiesResponse', GetUserClaimedBountiesResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /user/claimed-bounties',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetUserClaimedBountiesResponseSchema,
        },
      },
    },
  },
});

