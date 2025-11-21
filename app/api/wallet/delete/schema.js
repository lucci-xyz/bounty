import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/wallet/delete';

const DeleteWalletDeleteResponseSchema = z.unknown();
registry.register('DeleteWalletDeleteResponse', DeleteWalletDeleteResponseSchema);
const DeleteWalletDeleteRequestSchema = z.unknown();
registry.register('DeleteWalletDeleteRequest', DeleteWalletDeleteRequestSchema);
registry.registerPath({
  method: 'delete',
  path,
  summary: 'Auto-generated schema for DELETE /wallet/delete',
  request: {
    body: {
      content: {
        'application/json': {
          schema: DeleteWalletDeleteRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: DeleteWalletDeleteResponseSchema,
        },
      },
    },
  },
});

