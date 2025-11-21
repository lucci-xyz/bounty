import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/beta/review';

const PostBetaReviewResponseSchema = z.unknown();
registry.register('PostBetaReviewResponse', PostBetaReviewResponseSchema);
const PostBetaReviewRequestSchema = z.unknown();
registry.register('PostBetaReviewRequest', PostBetaReviewRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /beta/review',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostBetaReviewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostBetaReviewResponseSchema,
        },
      },
    },
  },
});

