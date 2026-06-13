// GET /api/analytics/matrix — Get agent x skill matrix

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

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

    const matrix = await analyticsService.getAgentSkillMatrix(workspaceId);
    return NextResponse.json({ matrix });
  } catch (error) {
    console.error('[API] GET /analytics/matrix error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent-skill matrix' },
      { status: 500 }
    );
  }
}
