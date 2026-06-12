// DELETE /api/orchestrator/hire/[agentId]
// Fire a temporary agent

import { NextRequest, NextResponse } from 'next/server';
import { agentHiringService } from '@/lib/orchestrator';
import { initProviders } from '@/lib/ai-provider';
import { loadAgentConfigs, registerBuiltinSkillsAndTools } from '@/lib/agent-core/config-loader';
import { AGENT_CONFIGS } from '@/lib/agent-configs';

let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  await initProviders();
  loadAgentConfigs(AGENT_CONFIGS);
  registerBuiltinSkillsAndTools();
  initialized = true;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    await ensureInitialized();
    const { agentId } = await params;

    const success = await agentHiringService.fire(agentId);

    if (!success) {
      return NextResponse.json(
        { error: `Failed to fire agent: ${agentId}. Agent not found or is permanent.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, agentId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fire agent' },
      { status: 500 }
    );
  }
}
