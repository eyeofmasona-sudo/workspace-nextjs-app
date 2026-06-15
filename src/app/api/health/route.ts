// GET /api/health — liveness + readiness probe
// Public (excluded from auth middleware).
// Returns 200 + JSON when DB is reachable, 503 if not.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const start = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: 'ok',
        db: 'ok',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        db: 'unreachable',
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
