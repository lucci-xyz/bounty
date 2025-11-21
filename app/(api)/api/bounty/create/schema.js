import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

export const CreateBountyBodySchema = z.object({
  repoFullName: z.string().min(1),
  repoId: z.coerce.number(),
  issueNumber: z.coerce.number(),
  sponsorAddress: z.string().min(1),
  token: z.string().min(1).optional(),
  amount: z.string().min(1),
  deadline: z.string().min(1),
  txHash: z.string().min(1),
  installationId: z.coerce.number().int().optional(),
  network: z.string().min(1).optional(),
  tokenSymbol: z.string().min(1).optional(),
});

export const CreateBountySuccessSchema = z.object({
  success: z.literal(true),
  bountyId: z.string().min(1),
});

export const ErrorResponseSchema = z.object({
  error: z.string().min(1),
});

registry.register('CreateBountyBody', CreateBountyBodySchema);
registry.register('CreateBountySuccess', CreateBountySuccessSchema);
registry.register('GenericError', ErrorResponseSchema);

registry.registerPath({
  method: 'post',
  path: '/bounty/create',
  tags: ['Bounties'],
  summary: 'Create a new bounty for a GitHub issue.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBountyBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Bounty successfully created.',
      content: {
        'application/json': {
          schema: CreateBountySuccessSchema,
        },
      },
    },
    500: {
      description: 'Unexpected server error.',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});


