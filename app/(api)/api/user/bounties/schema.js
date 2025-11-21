import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/user/bounties';

const GetUserBountiesResponseSchema = z.unknown();
registry.register('GetUserBountiesResponse', GetUserBountiesResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /user/bounties',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetUserBountiesResponseSchema,
        },
      },
    },
  },
});

