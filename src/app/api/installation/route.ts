// GET /api/installation — Get installed items for an agent
// POST /api/installation — Install a skill or tool to an agent

import { NextRequest, NextResponse } from 'next/server';
import { installationService } from '@/lib/installation';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const type = searchParams.get('type');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId query parameter is required' },
        { status: 400 }
      );
    }

    if (type === 'skill') {
      const skills = await installationService.getInstalledSkills(agentId);
      return NextResponse.json({ skills });
    }

    if (type === 'tool') {
      const tools = await installationService.getInstalledTools(agentId);
      return NextResponse.json({ tools });
    }

    // Return both skills and tools if no type specified
    const [skills, tools] = await Promise.all([
      installationService.getInstalledSkills(agentId),
      installationService.getInstalledTools(agentId),
    ]);

    return NextResponse.json({ skills, tools });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /installation error:');
    return NextResponse.json(
      { error: 'Failed to fetch installed items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, type, key } = body;

    if (!agentId || !type || !key) {
      return NextResponse.json(
        { error: 'agentId, type, and key are required' },
        { status: 400 }
      );
    }

    if (!['skill', 'tool'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be "skill" or "tool"' },
        { status: 400 }
      );
    }

    let result;
    if (type === 'skill') {
      result = await installationService.installSkill(agentId, key);
    } else {
      result = await installationService.installTool(agentId, key);
    }

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /installation error:');
    return NextResponse.json(
      { error: 'Failed to install item' },
      { status: 500 }
    );
  }
}
