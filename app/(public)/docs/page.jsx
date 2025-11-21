'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

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
            Live, auto-generated OpenAPI reference. All endpoints listed here are sourced directly
            from the Next.js API routes.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <SwaggerUI url="/api/openapi" docExpansion="none" defaultModelExpandDepth={1} />
        </div>
      </div>
    </div>
  );
}


