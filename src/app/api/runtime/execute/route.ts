// POST /api/runtime/execute — Execute an agent through the new runtime
// Uses the Stage 2 AgentRuntime + AgentRegistry architecture.

import { NextRequest, NextResponse } from 'next/server';
import { agentRuntime } from '@/lib/agent-core/runtime';
import { agentRegistry } from '@/lib/agent-core/registry';
import { loadAgentConfigs } from '@/lib/agent-core/config-loader';
import { AGENT_CONFIGS } from '@/lib/agent-configs';
import { initProviders } from '@/lib/ai-provider';
import { z } from 'zod';
import { loggers } from '@/lib/logger';

// Ensure initialization (idempotent)
let initialized = false;
async function ensureInitialized() {
  if (initialized) return;

  // Initialize providers
  await initProviders();

  // Load agent configs into registry
  loadAgentConfigs(AGENT_CONFIGS);

  initialized = true;
}

const executeRequestSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  message: z.string().min(1, 'message is required').max(10000, 'message is too long'),
  history: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string(),
  })).optional().default([]),
  modelOverride: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32768).optional(),
  correlationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const parsed = executeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { agentId, message, history, modelOverride, temperature, maxTokens, correlationId } = parsed.data;

    // Verify agent exists in registry
    if (!agentRegistry.has(agentId)) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}. Available: [${agentRegistry.listIds().join(', ')}]` },
        { status: 404 },
      );
    }

    const result = await agentRuntime.execute(agentId, {
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      modelOverride,
      temperature,
      maxTokens,
      correlationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /runtime/execute error:');

    if (error instanceof Error) {
      if (error.message.includes('Provider not found') || error.message.includes('No available model')) {
        return NextResponse.json(
          { error: 'AI provider not configured. Set OPENROUTER_API_KEY in .env' },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute agent' },
      { status: 500 },
    );
  }
}
