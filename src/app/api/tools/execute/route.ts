// POST /api/tools/execute — Execute a tool (with permission and approval checks)

import { NextRequest, NextResponse } from 'next/server';
import { toolHub } from '@/lib/tool-hub/ToolHub';
import { executeToolSchema } from '@/lib/validations';
import { loggers } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = executeToolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await toolHub.executeTool({
      workspaceId: parsed.data.workspaceId,
      agentId: parsed.data.agentId,
      taskId: parsed.data.taskId,
      toolKey: parsed.data.toolKey,
      action: parsed.data.action,
      input: parsed.data.input,
      correlationId: parsed.data.correlationId,
      resumedFromApproval: false,
    });

    // Return appropriate status codes
    let statusCode = 200;
    if (result.status === 'blocked') statusCode = 403;
    if (result.status === 'requires_approval') statusCode = 202;
    if (result.status === 'failed') statusCode = 400;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] POST /tools/execute error:');
    return NextResponse.json({ error: 'Failed to execute tool' }, { status: 500 });
  }
}
