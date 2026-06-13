// GET /api/analytics/overview — Get system overview (counts of all entities)

import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET() {
  try {
    const overview = await analyticsService.getSystemOverview();
    return NextResponse.json({ overview });
  } catch (error) {
    console.error('[API] GET /analytics/overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system overview' },
      { status: 500 }
    );
  }
}
