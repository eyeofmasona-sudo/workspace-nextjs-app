// GET /api/agents/:id/profile — Get agent profile
// PATCH /api/agents/:id/profile — Update agent profile

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agentProfileService } from '@/lib/agent-system';
import { updateProfileSchema } from '@/lib/validations';
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

    const profile = await agentProfileService.getAgentProfile(id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found for agent' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /agents/:id/profile error:');
    return NextResponse.json({ error: 'Failed to fetch agent profile' }, { status: 500 });
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
    const parseResult = updateProfileSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const profile = await agentProfileService.updateAgentProfile(id, parseResult.data);
    return NextResponse.json({ profile });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] PATCH /agents/:id/profile error:');
    return NextResponse.json({ error: 'Failed to update agent profile' }, { status: 500 });
  }
}
