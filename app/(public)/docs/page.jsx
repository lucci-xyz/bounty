'use client';

/**
 * Page to display the BountyPay API documentation using Swagger UI.
 */

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Load Swagger UI only on the client side
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

/**
 * Renders the API Docs page.
 */
export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto w-full py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground/70 mb-2">
            Documentation
          </p>
          <h1 className="text-3xl font-semibold leading-tight">BountyPay API</h1>
          <p className="text-muted-foreground mt-2">
            Live, auto-generated OpenAPI reference. All endpoints are sourced from API routes.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          {/* Renders the Swagger UI with the OpenAPI documentation */}
          <SwaggerUI url="/api/openapi" docExpansion="none" defaultModelExpandDepth={1} />
        </div>
      </div>
    </div>
  );
}

