// POST /api/orchestrator/chat
// The main orchestrator-first chat endpoint.
// User talks to orchestrator → orchestrator delegates → agents execute → orchestrator synthesizes

import { NextRequest, NextResponse } from 'next/server';
import { orchestratorChatEngine } from '@/lib/orchestrator';
import { initProviders } from '@/lib/ai-provider';
import { loadAgentConfigs, registerBuiltinSkillsAndTools } from '@/lib/agent-core/config-loader';
import { durableEventWorker } from '@/lib/event-bus/DurableEventWorker';
import { AGENT_CONFIGS } from '@/lib/agent-configs';
import { z } from 'zod';
import { loggers } from '@/lib/logger';

// Ensure initialization
let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  await initProviders();
  loadAgentConfigs(AGENT_CONFIGS);
  registerBuiltinSkillsAndTools();
  durableEventWorker.start(); // replay missed events after cold start
  initialized = true;
}

const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  history: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string(),
  })).optional().default([]),
  workspaceId: z.string().optional(),
  mode: z.enum(['auto', 'manual']).optional().default('auto'),
  targetAgentIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await orchestratorChatEngine.chat({
      message: parsed.data.message,
      history: parsed.data.history,
      workspaceId: parsed.data.workspaceId,
      mode: parsed.data.mode,
      targetAgentIds: parsed.data.targetAgentIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    loggers.orchestrator.error({ err: error }, '[API] POST /orchestrator/chat error:');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process orchestrator chat',
        orchestratorResponse: 'An error occurred while processing your request.',
        delegatedTasks: [],
        totalDurationMs: 0,
        modelUsed: 'none',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      },
      { status: 500 }
    );
  }
}
