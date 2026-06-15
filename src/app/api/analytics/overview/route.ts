// GET /api/analytics/overview — Get system overview (counts of all entities)

import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';
import { loggers } from '@/lib/logger';

export async function GET() {
  try {
    const overview = await analyticsService.getSystemOverview();
    return NextResponse.json({ overview });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /analytics/overview error:');
    return NextResponse.json(
      { error: 'Failed to fetch system overview' },
      { status: 500 }
    );
  }
}
