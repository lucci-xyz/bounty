import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/allowlist/{bountyId}';

const GetAllowlistBountyIdResponseSchema = z.unknown();
registry.register('GetAllowlistBountyIdResponse', GetAllowlistBountyIdResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /allowlist/{bountyId}',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetAllowlistBountyIdResponseSchema,
        },
      },
    },
  },
});

const PostAllowlistBountyIdResponseSchema = z.unknown();
registry.register('PostAllowlistBountyIdResponse', PostAllowlistBountyIdResponseSchema);
const PostAllowlistBountyIdRequestSchema = z.unknown();
registry.register('PostAllowlistBountyIdRequest', PostAllowlistBountyIdRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /allowlist/{bountyId}',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostAllowlistBountyIdRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostAllowlistBountyIdResponseSchema,
        },
      },
    },
  },
});

const DeleteAllowlistBountyIdResponseSchema = z.unknown();
registry.register('DeleteAllowlistBountyIdResponse', DeleteAllowlistBountyIdResponseSchema);
const DeleteAllowlistBountyIdRequestSchema = z.unknown();
registry.register('DeleteAllowlistBountyIdRequest', DeleteAllowlistBountyIdRequestSchema);
registry.registerPath({
  method: 'delete',
  path,
  summary: 'Auto-generated schema for DELETE /allowlist/{bountyId}',
  request: {
    body: {
      content: {
        'application/json': {
          schema: DeleteAllowlistBountyIdRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: DeleteAllowlistBountyIdResponseSchema,
        },
      },
    },
  },
});

