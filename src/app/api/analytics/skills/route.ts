// GET /api/analytics/skills — Get skill usage stats and trending

import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';
import { loggers } from '@/lib/logger';

export async function GET() {
  try {
    const [usageStats, trending] = await Promise.all([
      analyticsService.getSkillUsageStats(),
      analyticsService.getTrendingSkills(),
    ]);

    return NextResponse.json({ usageStats, trending });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /analytics/skills error:');
    return NextResponse.json(
      { error: 'Failed to fetch skill analytics' },
      { status: 500 }
    );
  }
}
