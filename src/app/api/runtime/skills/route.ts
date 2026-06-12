// GET /api/runtime/skills — Get all registered skills and their details
// POST /api/runtime/skills — Execute a skill test (optional)

import { NextRequest, NextResponse } from 'next/server';
import { skillRegistry } from '@/lib/skills/registry';
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

    const stats = skillRegistry.getStats();
    const skills = skillRegistry.listAll().map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      version: skill.version,
    }));

    return NextResponse.json({
      skills,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get skills' },
      { status: 500 },
    );
  }
}
