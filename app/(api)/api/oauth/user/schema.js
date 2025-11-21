import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/oauth/user';

const GetOauthUserResponseSchema = z.unknown();
registry.register('GetOauthUserResponse', GetOauthUserResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /oauth/user',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetOauthUserResponseSchema,
        },
      },
    },
  },
});

