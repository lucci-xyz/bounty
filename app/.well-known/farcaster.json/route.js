import { NextResponse } from 'next/server';
import { MINI_APP_MANIFEST } from '@/app/base-mini-app/manifest';

export function GET() {
  return NextResponse.json(MINI_APP_MANIFEST, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}


