// GET /api/runtime/status — Get runtime status for all registered agents

import { NextResponse } from 'next/server';
import { agentRuntime } from '@/lib/agent-core/runtime';
import { agentRegistry } from '@/lib/agent-core/registry';
import { loadAgentConfigs } from '@/lib/agent-core/config-loader';
import { AGENT_CONFIGS } from '@/lib/agent-configs';
import { initProviders } from '@/lib/ai-provider';

let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  await initProviders();
  loadAgentConfigs(AGENT_CONFIGS);
  initialized = true;
}

export async function GET() {
  try {
    await ensureInitialized();

    const configs = agentRegistry.listAll();
    const stats = agentRegistry.getStats();

    const agents = configs.map((config) => {
      const state = agentRuntime.getState(config.id);
      return {
        id: config.id,
        name: config.name,
        role: config.role,
        type: config.type,
        description: config.description,
        status: state.status,
        model: {
          preferred: config.model.preferred.model,
          fallback: config.model.fallback?.model ?? null,
        },
        execution: {
          temperature: config.execution.temperature,
          maxTokens: config.execution.maxTokens,
        },
        skills: config.skills.length,
        tools: config.tools.length,
        hooks: config.hooks.map((h) => h.name),
        visualProfile: config.visualProfile,
        executionCount: state.executionCount,
        lastActivityAt: state.lastActivityAt || null,
      };
    });

    return NextResponse.json({
      agents,
      stats,
      registrySize: agentRegistry.listIds().length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get runtime status' },
      { status: 500 },
    );
  }
}
