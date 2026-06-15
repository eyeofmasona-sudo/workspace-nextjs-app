// GET /api/tools/executions/[executionId] — Get a single tool execution

import { NextRequest, NextResponse } from 'next/server';
import { toolExecutionService } from '@/lib/tool-hub/ToolExecutionService';
import { loggers } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;
    const execution = await toolExecutionService.getExecution(executionId);

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] GET /tools/executions/[executionId] error:');
    return NextResponse.json({ error: 'Failed to fetch execution' }, { status: 500 });
  }
}
