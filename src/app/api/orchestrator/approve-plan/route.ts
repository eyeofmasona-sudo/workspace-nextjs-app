// POST /api/orchestrator/approve-plan — Approve a plan and create Epics/Tasks/Subtasks

import { NextRequest, NextResponse } from 'next/server';
import { orchestratorEngine } from '@/lib/orchestrator';
import { approvePlanSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = approvePlanSchema.safeParse(body);
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

    // Approve the plan — creates Epics, Tasks, Subtasks in DB
    const response = await orchestratorEngine.approvePlan({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      plan: input.plan as Parameters<typeof orchestratorEngine.approvePlan>[0]['plan'],
      createProject: input.createProject,
      projectName: input.projectName,
    });

    const statusCode = response.type === 'error' ? 500 : 201;
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('[API] POST /orchestrator/approve-plan error:', error);
    return NextResponse.json(
      {
        type: 'error',
        summary: `Failed to approve plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
