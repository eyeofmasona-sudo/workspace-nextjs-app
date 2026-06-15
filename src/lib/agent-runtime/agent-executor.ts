// ─── Agent OS — Agent Executor ────────────────────────────────
// Resolves an agent's model config → picks provider → executes completion.
// This is the single entry point for "make an agent think".

import { db } from '../db';
import { providerRegistry } from '../ai-provider/provider-registry';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type {
  CompletionRequest,
  CompletionResponse,
  ChatMessage,
  AgentExecutionResult,
  ResolvedModel,
} from '../ai-provider/types';
import { ProviderError } from '../ai-provider/types';
import { loggers } from '@/lib/logger';

// ─── Public request type ─────────────────────────────────────

export interface AgentChatRequest {
  agentId: string;
  messages: ChatMessage[];
  /** Override model for this request (bypasses agent config) */
  modelOverride?: string;
  /** Override temperature */
  temperature?: number;
  /** Override max tokens */
  maxTokens?: number;
}

// ─── Agent Executor ──────────────────────────────────────────

class AgentExecutor {
  private static instance: AgentExecutor | null = null;

  private constructor() {}

  static getInstance(): AgentExecutor {
    if (!AgentExecutor.instance) {
      AgentExecutor.instance = new AgentExecutor();
    }
    return AgentExecutor.instance;
  }

  /**
   * Execute a chat completion for an agent.
   *
   * Flow:
   * 1. Load agent from DB
   * 2. Resolve agent's model config (preferred → fallback)
   * 3. Get provider from registry
   * 4. Build completion request with system prompt
   * 5. Execute via provider
   * 6. Log cost
   * 7. Update agent status
   * 8. Return result
   */
  async execute(request: AgentChatRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    // 1. Load agent
    const agent = await db.agent.findUnique({
      where: { id: request.agentId },
      include: { modelConfigs: { where: { enabled: true } } },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    // 2. Resolve model
    const resolvedModel = this.resolveModel(agent.modelConfigs, request.modelOverride);

    if (!resolvedModel) {
      throw new Error(
        `No enabled model config for agent ${agent.name} (${agent.role}). ` +
        `Configure a model via PATCH /api/agents/${agent.id}/models`
      );
    }

    // 3. Get provider
    const provider = providerRegistry.getOrThrow(resolvedModel.provider);

    // 4. Build messages with system prompt
    const messages: ChatMessage[] = [];

    if (agent.systemPrompt) {
      messages.push({ role: 'system', content: agent.systemPrompt });
    }

    messages.push(...request.messages);

    // 5. Build completion request
    const completionRequest: CompletionRequest = {
      model: resolvedModel.model,
      messages,
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? resolvedModel.maxTokens ?? 2048,
    };

    // 6. Update agent status to "thinking"
    await this.updateAgentStatus(request.agentId, 'thinking');

    let response: CompletionResponse;

    try {
      // 7. Execute
      response = await provider.complete(completionRequest);

      // 8. Update agent status to "working" (briefly, then idle)
      await this.updateAgentStatus(request.agentId, 'working');
    } catch (error) {
      // Update agent status to "error"
      await this.updateAgentStatus(request.agentId, 'error');

      if (error instanceof ProviderError && error.retryable && resolvedModel.preferenceType === 'preferred') {
        // Try fallback model if available
        const fallback = agent.modelConfigs.find(
          (c) => c.preferenceType === 'fallback' && c.enabled
        );
        if (fallback) {
          loggers.agentRuntime.info(
            `[AgentExecutor] Retrying with fallback model: ${fallback.provider}/${fallback.model}`
          );
          const fallbackProvider = providerRegistry.getOrThrow(fallback.provider);
          const fallbackRequest: CompletionRequest = {
            ...completionRequest,
            model: fallback.model,
            maxTokens: request.maxTokens ?? fallback.maxTokens ?? 2048,
          };
          response = await fallbackProvider.complete(fallbackRequest);

          await this.updateAgentStatus(request.agentId, 'working');
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    const durationMs = Date.now() - startTime;

    // 9. Log cost
    await this.logCost(request.agentId, resolvedModel, response, durationMs);

    // 10. Set agent back to idle after a short delay
    setTimeout(() => {
      this.updateAgentStatus(request.agentId, 'idle').catch(loggers.agentRuntime.error);
    }, 1500);

    return {
      agentId: request.agentId,
      response,
      resolvedModel,
      durationMs,
    };
  }

  /**
   * Resolve the model to use for an agent.
   * Priority: modelOverride > preferred > fallback
   */
  private resolveModel(
    modelConfigs: Array<{
      provider: string;
      model: string;
      preferenceType: string;
      enabled: boolean;
      maxCostPerTask: number | null;
      maxTokens: number | null;
    }>,
    modelOverride?: string,
  ): ResolvedModel | null {
    // If model override is provided, use openrouter as provider
    if (modelOverride) {
      return {
        provider: 'openrouter',
        model: modelOverride,
        preferenceType: 'override',
        maxCostPerTask: null,
        maxTokens: null,
      };
    }

    // Try preferred first
    const preferred = modelConfigs.find((c) => c.preferenceType === 'preferred');
    if (preferred) {
      return {
        provider: preferred.provider,
        model: preferred.model,
        preferenceType: preferred.preferenceType,
        maxCostPerTask: preferred.maxCostPerTask,
        maxTokens: preferred.maxTokens,
      };
    }

    // Try fallback
    const fallback = modelConfigs.find((c) => c.preferenceType === 'fallback');
    if (fallback) {
      return {
        provider: fallback.provider,
        model: fallback.model,
        preferenceType: fallback.preferenceType,
        maxCostPerTask: fallback.maxCostPerTask,
        maxTokens: fallback.maxTokens,
      };
    }

    return null;
  }

  /**
   * Update agent status and emit event
   */
  private async updateAgentStatus(agentId: string, status: string): Promise<void> {
    try {
      const agent = await db.agent.findUnique({ where: { id: agentId } });
      if (!agent) return;

      const previousStatus = agent.status;

      await Promise.all([
        db.agent.update({ where: { id: agentId }, data: { status } }),
        db.agentRuntimeState.upsert({
          where: { agentId },
          update: { status, lastActivityAt: new Date() },
          create: {
            agentId,
            status,
            locationZone: agent.locationZone,
            lastActivityAt: new Date(),
          },
        }),
      ]);

      await eventBus.emit(EventTypes.AGENT_STATUS_CHANGED, {
        agentId,
        fromStatus: previousStatus as 'idle' | 'thinking' | 'working' | 'waiting_api' | 'reviewing' | 'waiting_approval' | 'done' | 'error' | 'offline',
        toStatus: status as 'idle' | 'thinking' | 'working' | 'waiting_api' | 'reviewing' | 'waiting_approval' | 'done' | 'error' | 'offline',
        timestamp: Date.now(),
        source: 'agent-executor',
      });
    } catch (error) {
      loggers.agentRuntime.error({ err: error }, '[AgentExecutor] Failed to update agent status:');
    }
  }

  /**
   * Log the cost of an AI completion
   */
  private async logCost(
    agentId: string,
    model: ResolvedModel,
    response: CompletionResponse,
    _durationMs: number,
  ): Promise<void> {
    try {
      // Rough cost estimation (can be refined with actual pricing data)
      const costPerPromptToken = this.getCostPerPromptToken(model.model);
      const costPerCompletionToken = this.getCostPerCompletionToken(model.model);
      const cost =
        response.usage.promptTokens * costPerPromptToken +
        response.usage.completionTokens * costPerCompletionToken;

      await db.costLog.create({
        data: {
          agentId,
          provider: model.provider,
          model: model.model,
          tokensIn: response.usage.promptTokens,
          tokensOut: response.usage.completionTokens,
          cost,
        },
      });

      await eventBus.emit(EventTypes.COST_LOGGED, {
        costLogId: '',
        agentId,
        provider: model.provider,
        model: model.model,
        cost,
        timestamp: Date.now(),
        source: 'agent-executor',
      });
    } catch (error) {
      loggers.agentRuntime.error({ err: error }, '[AgentExecutor] Failed to log cost:');
    }
  }

  /**
   * Rough cost per prompt token (USD) by model.
   * Update these as pricing changes.
   */
  private getCostPerPromptToken(model: string): number {
    if (model.includes('gpt-4o')) return 0.0000025;
    if (model.includes('gpt-4')) return 0.00003;
    if (model.includes('claude-3.5-sonnet') || model.includes('claude-3-5-sonnet')) return 0.000003;
    if (model.includes('claude-3-opus')) return 0.000015;
    if (model.includes('claude-3-haiku')) return 0.00000025;
    if (model.includes('gemini-2')) return 0.00000125;
    if (model.includes('llama') || model.includes('mistral')) return 0.0000002;
    // Default: cheap model rate
    return 0.0000005;
  }

  private getCostPerCompletionToken(model: string): number {
    if (model.includes('gpt-4o')) return 0.00001;
    if (model.includes('gpt-4')) return 0.00006;
    if (model.includes('claude-3.5-sonnet') || model.includes('claude-3-5-sonnet')) return 0.000015;
    if (model.includes('claude-3-opus')) return 0.000075;
    if (model.includes('claude-3-haiku')) return 0.00000125;
    if (model.includes('gemini-2')) return 0.000005;
    if (model.includes('llama') || model.includes('mistral')) return 0.0000005;
    return 0.000001;
  }
}

export const agentExecutor = AgentExecutor.getInstance();
