import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/beta/notify';

const PostBetaNotifyResponseSchema = z.unknown();
registry.register('PostBetaNotifyResponse', PostBetaNotifyResponseSchema);
const PostBetaNotifyRequestSchema = z.unknown();
registry.register('PostBetaNotifyRequest', PostBetaNotifyRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /beta/notify',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostBetaNotifyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostBetaNotifyResponseSchema,
        },
      },
    },
  },
});

