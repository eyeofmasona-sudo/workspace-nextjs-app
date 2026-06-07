// POST /api/orchestrator/plan — Create a plan without creating tasks (preview)

import { NextRequest, NextResponse } from 'next/server';
import { orchestratorEngine } from '@/lib/orchestrator';
import { orchestratorPlanSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = orchestratorPlanSchema.safeParse(body);
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

    // Create a plan (preview only, no tasks created)
    const plan = await orchestratorEngine.createPlan(
      input.workspaceId,
      input.message,
      input.projectId
    );

    return NextResponse.json({
      type: 'plan_created',
      summary: `Plan created: ${plan.epics.length} epic(s), ${plan.epics.reduce((s, e) => s + e.tasks.length, 0)} task(s)`,
      plan,
    }, { status: 200 });
  } catch (error) {
    console.error('[API] POST /orchestrator/plan error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
