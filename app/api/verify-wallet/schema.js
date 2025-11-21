import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/verify-wallet';

const PostVerifyWalletResponseSchema = z.unknown();
registry.register('PostVerifyWalletResponse', PostVerifyWalletResponseSchema);
const PostVerifyWalletRequestSchema = z.unknown();
registry.register('PostVerifyWalletRequest', PostVerifyWalletRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /verify-wallet',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostVerifyWalletRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostVerifyWalletResponseSchema,
        },
      },
    },
  },
});

