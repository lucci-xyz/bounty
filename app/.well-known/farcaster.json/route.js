import { NextResponse } from 'next/server';
import { MINI_APP_MANIFEST } from '@/app/(public)/base-mini-app/manifest';

/**
 * Handles GET requests to the farcaster.json endpoint.
 * Responds with the mini app manifest as JSON.
 * Sets cache headers for optimal performance.
 *
 * @returns {NextResponse} JSON response with MINI_APP_MANIFEST
 */
export function GET() {
  return NextResponse.json(MINI_APP_MANIFEST, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}