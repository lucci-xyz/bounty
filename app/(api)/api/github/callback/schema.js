import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/github/callback';

const PostGithubCallbackResponseSchema = z.unknown();
registry.register('PostGithubCallbackResponse', PostGithubCallbackResponseSchema);
const PostGithubCallbackRequestSchema = z.unknown();
registry.register('PostGithubCallbackRequest', PostGithubCallbackRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /github/callback',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostGithubCallbackRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostGithubCallbackResponseSchema,
        },
      },
    },
  },
});

