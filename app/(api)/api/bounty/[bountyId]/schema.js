import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/bounty/{bountyId}';

const GetBountyBountyIdResponseSchema = z.unknown();
registry.register('GetBountyBountyIdResponse', GetBountyBountyIdResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /bounty/{bountyId}',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetBountyBountyIdResponseSchema,
        },
      },
    },
  },
});

