// GET /api/agents/:id/capabilities — Get agent capabilities
// PATCH /api/agents/:id/capabilities — Update agent capabilities (array, each is an upsert)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agentCapabilityService } from '@/lib/agent-system';
import { updateCapabilitySchema } from '@/lib/validations';
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

    const capabilities = await agentCapabilityService.getAgentCapabilities(id);
    return NextResponse.json({ capabilities });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /agents/:id/capabilities error:');
    return NextResponse.json({ error: 'Failed to fetch agent capabilities' }, { status: 500 });
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

    // Validate input with zod (array schema)
    const parseResult = updateCapabilitySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Upsert each capability
    const updatedCapabilities: Record<string, unknown>[] = [];
    for (const item of parseResult.data) {
      const updated = await agentCapabilityService.updateCapability(id, item);
      updatedCapabilities.push(updated as Record<string, unknown>);
    }

    return NextResponse.json({ capabilities: updatedCapabilities });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] PATCH /agents/:id/capabilities error:');
    return NextResponse.json({ error: 'Failed to update agent capabilities' }, { status: 500 });
  }
}
