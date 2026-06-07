// GET /api/status — Get system status overview

import { NextResponse } from 'next/server';
import { getSystemStatus } from '@/lib/seed';

export async function GET() {
  try {
    const status = await getSystemStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error('[API] GET /status error:', error);
    return NextResponse.json({ error: 'Failed to get system status' }, { status: 500 });
  }
}
