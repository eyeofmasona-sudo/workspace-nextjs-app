// GET /api/agents/:id/runtime — Get agent runtime state
// PATCH /api/agents/:id/runtime — Update agent runtime state

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agentRuntimeService } from '@/lib/agent-system';
import { updateRuntimeSchema } from '@/lib/validations';
import { loggers } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const runtimeState = await agentRuntimeService.getRuntimeState(id);
    return NextResponse.json({ runtimeState });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /agents/:id/runtime error:');
    return NextResponse.json({ error: 'Failed to fetch agent runtime state' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate input with zod
    const parseResult = updateRuntimeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    let result;

    // Handle special cases for runtime updates
    if (data.status !== undefined) {
      // If status is provided, use updateAgentStatus for dual-sync
      result = await agentRuntimeService.updateAgentStatus(id, data.status);
    } else if (data.locationZone !== undefined) {
      // If locationZone is provided, use updateAgentLocation for dual-sync
      result = await agentRuntimeService.updateAgentLocation(id, data.locationZone);
    } else if (data.activeTaskId !== undefined) {
      if (typeof data.activeTaskId === 'string') {
        // Assign a specific task
        result = await agentRuntimeService.assignActiveTask(id, data.activeTaskId);
      } else if (data.activeTaskId === null) {
        // Clear the active task
        result = await agentRuntimeService.clearActiveTask(id);
      } else {
        result = await agentRuntimeService.updateRuntimeState(id, data);
      }
    } else {
      // Generic runtime state update
      result = await agentRuntimeService.updateRuntimeState(id, data);
    }

    return NextResponse.json({ runtimeState: result });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] PATCH /agents/:id/runtime error:');
    return NextResponse.json({ error: 'Failed to update agent runtime state' }, { status: 500 });
  }
}
