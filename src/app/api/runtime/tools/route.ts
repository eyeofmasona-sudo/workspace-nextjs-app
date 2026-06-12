// GET /api/runtime/tools — Get all registered tools and their details

import { NextResponse } from 'next/server';
import { toolRegistry } from '@/lib/tools/registry';
import { registerBuiltinSkillsAndTools } from '@/lib/agent-core/config-loader';
import { loadAgentConfigs } from '@/lib/agent-core/config-loader';
import { AGENT_CONFIGS } from '@/lib/agent-configs';
import { initProviders } from '@/lib/ai-provider';

let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  await initProviders();
  loadAgentConfigs(AGENT_CONFIGS);
  registerBuiltinSkillsAndTools();
  initialized = true;
}

export async function GET() {
  try {
    await ensureInitialized();

    const stats = toolRegistry.getStats();
    const tools = toolRegistry.listAll().map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      version: tool.version,
      requiredPermission: tool.requiredPermission,
      functionName: tool.functionDefinition.name,
    }));

    return NextResponse.json({
      tools,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tools' },
      { status: 500 },
    );
  }
}
