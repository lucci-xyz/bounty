import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/oauth/logout';

const PostOauthLogoutResponseSchema = z.unknown();
registry.register('PostOauthLogoutResponse', PostOauthLogoutResponseSchema);
const PostOauthLogoutRequestSchema = z.unknown();
registry.register('PostOauthLogoutRequest', PostOauthLogoutRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /oauth/logout',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostOauthLogoutRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostOauthLogoutResponseSchema,
        },
      },
    },
  },
});

