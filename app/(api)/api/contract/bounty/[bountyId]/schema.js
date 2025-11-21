import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/contract/bounty/{bountyId}';

const GetContractBountyBountyIdResponseSchema = z.unknown();
registry.register('GetContractBountyBountyIdResponse', GetContractBountyBountyIdResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /contract/bounty/{bountyId}',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetContractBountyBountyIdResponseSchema,
        },
      },
    },
  },
});

