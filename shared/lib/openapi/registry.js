import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

const API_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.APP_VERSION ||
  process.env.npm_package_version ||
  '1.0.0';

export const registry = new OpenAPIRegistry();

export function getOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'BountyPay API',
      version: API_VERSION,
      description: 'Programmatic interface for the BountyPay GitHub bounty platform.',
    },
    servers: [
      {
        url: '/api',
        description: 'Current environment',
      },
    ],
    tags: [
      {
        name: 'Bounties',
        description: 'Endpoints for creating and managing bounties.',
      },
    ],
  });
}


