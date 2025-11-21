import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/wallet/link';

const PostWalletLinkResponseSchema = z.unknown();
registry.register('PostWalletLinkResponse', PostWalletLinkResponseSchema);
const PostWalletLinkRequestSchema = z.unknown();
registry.register('PostWalletLinkRequest', PostWalletLinkRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /wallet/link',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostWalletLinkRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostWalletLinkResponseSchema,
        },
      },
    },
  },
});

