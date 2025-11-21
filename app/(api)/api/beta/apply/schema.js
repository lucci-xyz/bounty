import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/beta/apply';

const PostBetaApplyResponseSchema = z.unknown();
registry.register('PostBetaApplyResponse', PostBetaApplyResponseSchema);
const PostBetaApplyRequestSchema = z.unknown();
registry.register('PostBetaApplyRequest', PostBetaApplyRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /beta/apply',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostBetaApplyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostBetaApplyResponseSchema,
        },
      },
    },
  },
});

