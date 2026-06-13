// GET /api/analytics/tools — Get tool usage stats and trending

import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET() {
  try {
    const [usageStats, trending] = await Promise.all([
      analyticsService.getToolUsageStats(),
      analyticsService.getTrendingTools(),
    ]);

    return NextResponse.json({ usageStats, trending });
  } catch (error) {
    console.error('[API] GET /analytics/tools error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool analytics' },
      { status: 500 }
    );
  }
}
