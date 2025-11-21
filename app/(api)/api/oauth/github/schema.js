import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/oauth/github';

const GetOauthGithubResponseSchema = z.unknown();
registry.register('GetOauthGithubResponse', GetOauthGithubResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /oauth/github',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetOauthGithubResponseSchema,
        },
      },
    },
  },
});

