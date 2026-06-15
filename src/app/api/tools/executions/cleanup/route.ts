// POST /api/tools/executions/cleanup — Clean up old tool execution records
// GET /api/tools/executions/cleanup — Preview executions eligible for cleanup

import { NextRequest, NextResponse } from 'next/server';
import { toolExecutionService } from '@/lib/tool-hub/ToolExecutionService';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') ?? undefined;
    const olderThanDays = searchParams.get('olderThanDays')
      ? parseInt(searchParams.get('olderThanDays')!, 10)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;

    const executions = await toolExecutionService.getExecutionsNeedingCleanup({
      workspaceId,
      olderThanDays,
      limit,
    });

    return NextResponse.json({
      eligibleCount: executions.length,
      executions,
    });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] GET /tools/executions/cleanup error:');
    return NextResponse.json({ error: 'Failed to fetch cleanup candidates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const workspaceId = body.workspaceId ?? undefined;
    const olderThanDays = body.olderThanDays ?? 30;
    const status = body.status ?? undefined;
    const limit = body.limit ?? 1000;

    const result = await toolExecutionService.cleanupOldExecutions({
      workspaceId,
      olderThanDays,
      status,
      limit,
    });

    return NextResponse.json({
      deleted: result.deleted,
      message: `Cleaned up ${result.deleted} old execution records`,
    });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] POST /tools/executions/cleanup error:');
    return NextResponse.json({ error: 'Failed to cleanup executions' }, { status: 500 });
  }
}
