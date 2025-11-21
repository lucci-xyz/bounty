import './schema';
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'bountypay-github-app',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}

