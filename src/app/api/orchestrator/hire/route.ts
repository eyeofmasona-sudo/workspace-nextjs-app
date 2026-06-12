// POST /api/orchestrator/hire
// Hire a new temporary agent
// GET /api/orchestrator/hire
// List all hired (temporary) agents

import { NextRequest, NextResponse } from 'next/server';
import { agentHiringService } from '@/lib/orchestrator';
import { initProviders } from '@/lib/ai-provider';
import { loadAgentConfigs, registerBuiltinSkillsAndTools } from '@/lib/agent-core/config-loader';
import { AGENT_CONFIGS } from '@/lib/agent-configs';
import { z } from 'zod';

// Ensure initialization
let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  await initProviders();
  loadAgentConfigs(AGENT_CONFIGS);
  registerBuiltinSkillsAndTools();
  initialized = true;
}

const hireSchema = z.object({
  role: z.string().min(1).max(100),
  task: z.string().min(1).max(5000),
  capabilities: z.array(z.string()).min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const parsed = hireSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await agentHiringService.hire({
      role: parsed.data.role,
      task: parsed.data.task,
      capabilities: parsed.data.capabilities,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[API] POST /orchestrator/hire error:', error);
    return NextResponse.json(
      { success: false, agentId: '', agentName: '', role: '', assignedSkills: [], assignedTools: [], model: '', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureInitialized();

    const hiredAgents = agentHiringService.listHired();
    const count = agentHiringService.getHiredCount();

    return NextResponse.json({
      count,
      agents: hiredAgents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        description: a.description,
        model: a.model.preferred.model,
        skills: a.skills.filter(s => s.enabled).map(s => s.skillId),
        tools: a.tools.filter(t => t.enabled).map(t => t.toolId),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list hired agents' }, { status: 500 });
  }
}
