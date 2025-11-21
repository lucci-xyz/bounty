import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/user/profile';

const GetUserProfileResponseSchema = z.unknown();
registry.register('GetUserProfileResponse', GetUserProfileResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /user/profile',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetUserProfileResponseSchema,
        },
      },
    },
  },
});

const PostUserProfileResponseSchema = z.unknown();
registry.register('PostUserProfileResponse', PostUserProfileResponseSchema);
const PostUserProfileRequestSchema = z.unknown();
registry.register('PostUserProfileRequest', PostUserProfileRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /user/profile',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostUserProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostUserProfileResponseSchema,
        },
      },
    },
  },
});

