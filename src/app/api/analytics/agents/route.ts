// GET /api/analytics/agents — Get agent effectiveness

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId query parameter is required' },
        { status: 400 }
      );
    }

    const effectiveness = await analyticsService.getAgentEffectiveness(workspaceId);
    return NextResponse.json({ effectiveness });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /analytics/agents error:');
    return NextResponse.json(
      { error: 'Failed to fetch agent analytics' },
      { status: 500 }
    );
  }
}
