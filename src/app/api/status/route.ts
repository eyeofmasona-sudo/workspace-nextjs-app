// GET /api/status — Get system status overview

import { NextResponse } from 'next/server';
import { getSystemStatus } from '@/lib/seed';
import { loggers } from '@/lib/logger';

export async function GET() {
  try {
    const status = await getSystemStatus();
    return NextResponse.json({ status });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /status error:');
    return NextResponse.json({ error: 'Failed to get system status' }, { status: 500 });
  }
}
