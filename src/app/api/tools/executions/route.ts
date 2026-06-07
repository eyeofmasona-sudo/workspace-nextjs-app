// GET /api/tools/executions — List tool executions with filters

import { NextRequest, NextResponse } from 'next/server';
import { toolExecutionService } from '@/lib/tool-hub/ToolExecutionService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const agentId = searchParams.get('agentId') ?? undefined;
    const toolId = searchParams.get('toolId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const executions = await toolExecutionService.getExecutions({
      workspaceId,
      agentId,
      toolId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('[API] GET /tools/executions error:', error);
    return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
  }
}
