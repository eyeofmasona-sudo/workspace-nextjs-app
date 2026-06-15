// POST /api/ai/chat — Send a message to an agent and get AI response

import { NextRequest, NextResponse } from 'next/server';
import { agentExecutor } from '@/lib/agent-runtime/agent-executor';
import { initProviders } from '@/lib/ai-provider';
import { z } from 'zod';
import { loggers } from '@/lib/logger';

// Ensure providers are initialized (idempotent)
let providersInitialized = false;
async function ensureProviders() {
  if (!providersInitialized) {
    await initProviders();
    providersInitialized = true;
  }
}

const chatRequestSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  message: z.string().min(1, 'message is required').max(10000, 'message is too long'),
  /** Conversation history (previous messages) */
  history: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string(),
  })).optional().default([]),
  /** Override model for this request */
  modelOverride: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32768).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await ensureProviders();

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { agentId, message, history, modelOverride, temperature, maxTokens } = parsed.data;

    // Build messages array: history + new user message
    const messages = [
      ...history.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant' | 'tool', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const result = await agentExecutor.execute({
      agentId,
      messages,
      modelOverride,
      temperature,
      maxTokens,
    });

    return NextResponse.json({
      agentId: result.agentId,
      content: result.response.content,
      model: result.response.model,
      resolvedModel: result.resolvedModel,
      usage: result.response.usage,
      finishReason: result.response.finishReason,
      durationMs: result.durationMs,
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /ai/chat error:');

    if (error instanceof Error) {
      // Check for provider-specific errors
      if (error.message.includes('Provider not found')) {
        return NextResponse.json(
          { error: 'AI provider not configured. Set OPENROUTER_API_KEY in .env' },
          { status: 503 },
        );
      }
      if (error.message.includes('Agent not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('No enabled model config')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat request' },
      { status: 500 },
    );
  }
}
