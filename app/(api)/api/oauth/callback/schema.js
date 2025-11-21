import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/oauth/callback';

const GetOauthCallbackResponseSchema = z.unknown();
registry.register('GetOauthCallbackResponse', GetOauthCallbackResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /oauth/callback',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetOauthCallbackResponseSchema,
        },
      },
    },
  },
});

