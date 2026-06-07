// POST /api/orchestrator/message — Process a user message through the orchestrator

import { NextRequest, NextResponse } from 'next/server';
import { orchestratorEngine } from '@/lib/orchestrator';
import { orchestratorMessageSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = orchestratorMessageSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const input = result.data;

    // Process through orchestrator
    const response = await orchestratorEngine.processMessage({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      message: input.message,
      mode: input.mode,
    });

    const statusCode = response.type === 'error' ? 500 : 200;
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('[API] POST /orchestrator/message error:', error);
    return NextResponse.json(
      {
        type: 'error',
        summary: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
