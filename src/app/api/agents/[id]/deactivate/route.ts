// POST /api/agents/:id/deactivate — Deactivate a temporary agent

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { temporaryAgentService } from '@/lib/agent-system';
import { deactivateAgentSchema } from '@/lib/validations';

export async function POST(
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
    const parseResult = deactivateAgentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    await temporaryAgentService.deactivateTemporaryAgent(id);

    return NextResponse.json({
      message: 'Agent deactivated successfully',
      agentId: id,
      reason: parseResult.data.reason ?? 'Temporary agent deactivated',
    });
  } catch (error) {
    console.error('[API] POST /agents/:id/deactivate error:', error);
    return NextResponse.json({ error: 'Failed to deactivate agent' }, { status: 500 });
  }
}
