import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/network/env';

const PostNetworkEnvResponseSchema = z.unknown();
registry.register('PostNetworkEnvResponse', PostNetworkEnvResponseSchema);
const PostNetworkEnvRequestSchema = z.unknown();
registry.register('PostNetworkEnvRequest', PostNetworkEnvRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /network/env',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostNetworkEnvRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostNetworkEnvResponseSchema,
        },
      },
    },
  },
});

const GetNetworkEnvResponseSchema = z.unknown();
registry.register('GetNetworkEnvResponse', GetNetworkEnvResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /network/env',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetNetworkEnvResponseSchema,
        },
      },
    },
  },
});

