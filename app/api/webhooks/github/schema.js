import { z } from 'zod';
import { registry } from '@/lib/openapi/registry';

const path = '/webhooks/github';

const PostWebhooksGithubResponseSchema = z.unknown();
registry.register('PostWebhooksGithubResponse', PostWebhooksGithubResponseSchema);
const PostWebhooksGithubRequestSchema = z.unknown();
registry.register('PostWebhooksGithubRequest', PostWebhooksGithubRequestSchema);
registry.registerPath({
  method: 'post',
  path,
  summary: 'Auto-generated schema for POST /webhooks/github',
  request: {
    body: {
      content: {
        'application/json': {
          schema: PostWebhooksGithubRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: PostWebhooksGithubResponseSchema,
        },
      },
    },
  },
});

