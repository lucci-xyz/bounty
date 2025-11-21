import { z } from 'zod';
import { registry } from '@/shared/lib/openapi/registry';

const path = '/issue/{repoId}/{issueNumber}';

const GetIssueRepoIdIssueNumberResponseSchema = z.unknown();
registry.register('GetIssueRepoIdIssueNumberResponse', GetIssueRepoIdIssueNumberResponseSchema);
registry.registerPath({
  method: 'get',
  path,
  summary: 'Auto-generated schema for GET /issue/{repoId}/{issueNumber}',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: GetIssueRepoIdIssueNumberResponseSchema,
        },
      },
    },
  },
});

