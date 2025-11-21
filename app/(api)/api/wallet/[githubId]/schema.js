import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/wallet/{githubId}';

const GetWalletGithubIdResponseSchema = z.unknown();
registry.register('GetWalletGithubIdResponse', GetWalletGithubIdResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /wallet/{githubId}',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetWalletGithubIdResponseSchema,
        },
      },
    },
  },
});

