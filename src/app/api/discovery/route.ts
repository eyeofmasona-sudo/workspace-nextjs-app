// GET /api/discovery — Unified search across skills, tools, and agents
// POST /api/discovery — Find recommendations

import { NextRequest, NextResponse } from 'next/server';
import { discoveryService } from '@/lib/discovery';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const results = await discoveryService.search(q);
    return NextResponse.json({ results });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /discovery error:');
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, taskDescription, workspaceId } = body;

    if (!type || !taskDescription) {
      return NextResponse.json(
        { error: 'type and taskDescription are required' },
        { status: 400 }
      );
    }

    const validTypes = ['skill', 'tool', 'agent'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Find recommendations based on type
    let recommendations;
    if (type === 'skill') {
      recommendations = await discoveryService.findSkillForTask(taskDescription);
    } else if (type === 'tool') {
      recommendations = await discoveryService.findToolForTask(taskDescription);
    } else {
      recommendations = await discoveryService.findAgentForTask(taskDescription);
    }

    // Also include gap recommendations if workspaceId is provided
    let gapRecommendations;
    let agentRecommendations;
    if (workspaceId) {
      [gapRecommendations, agentRecommendations] = await Promise.all([
        discoveryService.recommendInstallations(workspaceId),
        discoveryService.recommendNewAgent(workspaceId),
      ]);
    }

    return NextResponse.json({
      type,
      recommendations,
      ...(workspaceId && { gapRecommendations, agentRecommendations }),
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /discovery error:');
    return NextResponse.json(
      { error: 'Failed to find recommendations' },
      { status: 500 }
    );
  }
}
