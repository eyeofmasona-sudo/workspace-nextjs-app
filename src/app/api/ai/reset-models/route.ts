// POST /api/ai/reset-models — Reset all agent model configs to OpenRouter defaults

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loggers } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // Delete all existing model configs for this workspace's agents
    const agents = await db.agent.findMany({
      where: { workspaceId },
      select: { id: true },
    });

    const agentIds = agents.map((a) => a.id);

    const deleteResult = await db.agentModelConfig.deleteMany({
      where: { agentId: { in: agentIds } },
    });

    // Re-seed with new defaults
    const { agentModelConfigService } = await import('@/lib/agent-system/AgentModelConfigService');
    const seedResult = await agentModelConfigService.ensureDefaultModels(workspaceId);

    return NextResponse.json({
      deleted: deleteResult.count,
      created: seedResult.created,
      skipped: seedResult.skipped,
      message: 'Model configs reset to OpenRouter defaults',
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /ai/reset-models error:');
    return NextResponse.json(
      { error: 'Failed to reset model configs' },
      { status: 500 },
    );
  }
}
