import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/github/installations';

const GetGithubInstallationsResponseSchema = z.unknown();
registry.register('GetGithubInstallationsResponse', GetGithubInstallationsResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /github/installations',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetGithubInstallationsResponseSchema,
        },
      },
    },
  },
});

