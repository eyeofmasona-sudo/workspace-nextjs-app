// POST /api/tools/executions/[executionId]/resume — Resume a tool execution after approval

import { NextRequest, NextResponse } from 'next/server';
import { toolExecutionService } from '@/lib/tool-hub/ToolExecutionService';
import { toolHub } from '@/lib/tool-hub/ToolHub';
import { loggers } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    // 1. Resume the approved execution (validates approval status)
    const { execution, toolKey } = await toolExecutionService.resumeApprovedExecution(executionId);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found or not resumable' },
        { status: 404 }
      );
    }

    // 2. Восстанавливаем полный input для resume.
    //    inputFull — полный JSON без обрезки, сохранённый при создании execution.
    //    inputSummary НЕ используется для resume (может быть усечён до 500 chars).
    let parsedInput: unknown = {};
    const rawInput = (execution as Record<string, unknown>).inputFull as string | null
      ?? execution.inputSummary; // fallback для старых записей до этого патча
    if (rawInput) {
      try {
        parsedInput = JSON.parse(rawInput);
      } catch {
        // inputFull должен всегда быть валидным JSON — логируем как ошибку
        parsedInput = {};
      }
    }

    const result = await toolHub.executeTool({
      workspaceId: execution.workspaceId,
      agentId: execution.agentId ?? '',
      taskId: execution.taskId ?? undefined,
      toolKey,
      action: execution.action,
      input: parsedInput,
      correlationId: execution.correlationId ?? undefined,
      resumedFromApproval: true,
    });

    return NextResponse.json({
      resumed: true,
      executionId,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resume execution';
    if (message.includes('not found') || message.includes('not in requires_approval')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes('not approved')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    loggers.toolHub.error({ err: error }, '[API] POST /tools/executions/[executionId]/resume error:');
    return NextResponse.json({ error: 'Failed to resume execution' }, { status: 500 });
  }
}
