// GET /api/agents/:id/models — Get agent model configs (with resolved model)
// PATCH /api/agents/:id/models — Update agent model configs (array)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agentModelConfigService } from '@/lib/agent-system';
import { updateModelConfigSchema } from '@/lib/validations';

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

    const [models, resolvedModel] = await Promise.all([
      agentModelConfigService.getAgentModels(id),
      agentModelConfigService.resolveModelForAgent(id),
    ]);

    return NextResponse.json({ models, resolvedModel });
  } catch (error) {
    console.error('[API] GET /agents/:id/models error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent models' }, { status: 500 });
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
    const parseResult = updateModelConfigSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Process each model config item
    const updatedModels: Record<string, unknown>[] = [];
    for (const item of parseResult.data) {
      if (item.preferenceType === 'preferred') {
        // Use setPreferredModel for preferred type
        const updated = await agentModelConfigService.setPreferredModel(
          id,
          item.provider,
          item.model
        );
        updatedModels.push(updated as Record<string, unknown>);
      } else if (item.preferenceType === 'fallback') {
        // Use addFallbackModel for fallback type
        const updated = await agentModelConfigService.addFallbackModel(
          id,
          item.provider,
          item.model
        );
        updatedModels.push(updated as Record<string, unknown>);
      }
    }

    return NextResponse.json({ models: updatedModels });
  } catch (error) {
    console.error('[API] PATCH /agents/:id/models error:', error);
    return NextResponse.json({ error: 'Failed to update agent models' }, { status: 500 });
  }
}
