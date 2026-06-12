// ─── Agent OS — Stage 2: Agent Runtime ──────────────────────
// Executes agents: resolves config → resolves model → builds prompt →
// calls provider → handles lifecycle → returns result.
//
// Key design decisions:
// - Runtime does NOT own agent configs (that's Registry)
// - Runtime does NOT own providers (that's ProviderRegistry)
// - Runtime does NOT own DB persistence (that's external)
// - Runtime OWNS the execution lifecycle and hook pipeline
// - Runtime is small, focused, and testable

import type {
  AgentConfig,
  AgentInput,
  AgentResult,
  AgentStateSnapshot,
  AgentStatus,
  HookContext,
} from './types';
import { DEFAULT_EXECUTION_CONFIG } from './types';
import { agentRegistry } from './registry';
import { providerRegistry } from '../ai-provider/provider-registry';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { composeHooks } from './hooks';
import type { AgentHook } from './types';
import type { CompletionRequest, ChatMessage } from '../ai-provider/types';
import { ProviderError } from '../ai-provider/types';

// ─── Agent Runtime ──────────────────────────────────────────

class AgentRuntime {
  private static instance: AgentRuntime | null = null;
  private executionCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, string | null> = new Map();
  private lastActivities: Map<string, number> = new Map();
  private activeTasks: Map<string, string | null> = new Map();

  private constructor() {}

  static getInstance(): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime();
    }
    return AgentRuntime.instance;
  }

  // ── Execute ────────────────────────────────────────────────

  /**
   * Execute an agent — the main entry point.
   *
   * Flow:
   * 1. Resolve agent config from registry
   * 2. Build hook pipeline (global + agent-specific hooks)
   * 3. Run beforeExecute hooks
   * 4. Resolve model
   * 5. Build messages with system prompt
   * 6. Call provider
   * 7. Handle errors (with fallback model retry)
   * 8. Run afterExecute hooks
   * 9. Update status
   * 10. Return result
   */
  async execute(agentId: string, input: AgentInput): Promise<AgentResult> {
    const startTime = Date.now();

    // 1. Resolve agent config
    const config = agentRegistry.getOrThrow(agentId);

    // 2. Build hook pipeline
    const hookPipeline = this.buildHookPipeline(config);

    // 3. Build messages
    const messages = this.buildMessages(config, input);

    // 4. Create hook context
    let context: HookContext = {
      agentConfig: config,
      messages,
      data: {},
    };

    // 5. Run beforeExecute hooks
    context = await hookPipeline.beforeExecute(context);

    // 6. Resolve model
    const resolvedModel = agentRegistry.resolveModel(agentId, input.modelOverride);
    context.resolvedModel = resolvedModel;

    // 7. Update status to "thinking"
    this.setStatus(agentId, 'thinking');

    // 8. Get provider
    const provider = providerRegistry.getOrThrow(resolvedModel.provider);

    // 9. Build completion request
    const executionConfig = config.execution;
    const completionRequest: CompletionRequest = {
      model: resolvedModel.model,
      messages: context.messages,
      temperature: input.temperature ?? executionConfig.temperature,
      maxTokens: input.maxTokens ?? resolvedModel.maxTokens ?? executionConfig.maxTokens,
      topP: executionConfig.topP,
      stop: executionConfig.stop,
    };

    // 10. Execute with error handling
    let result: AgentResult;

    try {
      const response = await provider.complete(completionRequest);

      // Update status to "working" briefly
      this.setStatus(agentId, 'working');

      result = {
        agentId: config.id,
        content: response.content,
        model: response.model,
        resolvedModel,
        usage: response.usage,
        finishReason: response.finishReason,
        durationMs: Date.now() - startTime,
        status: 'success',
      };
    } catch (error) {
      // Try fallback model on retryable errors
      if (
        error instanceof ProviderError &&
        error.retryable &&
        resolvedModel.preferenceType === 'preferred' &&
        config.model.fallback
      ) {
        console.log(
          `[AgentRuntime] Retrying with fallback model: ${config.model.fallback.provider}/${config.model.fallback.model}`
        );

        const fallbackModel: typeof resolvedModel = {
          provider: config.model.fallback.provider,
          model: config.model.fallback.model,
          preferenceType: 'fallback',
          maxCostPerTask: config.model.fallback.maxCostPerTask,
          maxTokens: config.model.fallback.maxTokens,
        };

        try {
          const fallbackProvider = providerRegistry.getOrThrow(fallbackModel.provider);
          const fallbackRequest: CompletionRequest = {
            ...completionRequest,
            model: fallbackModel.model,
            maxTokens: input.maxTokens ?? fallbackModel.maxTokens ?? executionConfig.maxTokens,
          };

          const response = await fallbackProvider.complete(fallbackRequest);

          this.setStatus(agentId, 'working');

          result = {
            agentId: config.id,
            content: response.content,
            model: response.model,
            resolvedModel: fallbackModel,
            usage: response.usage,
            finishReason: response.finishReason,
            durationMs: Date.now() - startTime,
            status: 'success',
          };
        } catch (fallbackError) {
          result = this.handleError(agentId, fallbackError, resolvedModel, startTime);
        }
      } else {
        result = this.handleError(agentId, error, resolvedModel, startTime);
      }

      // Run onError hooks
      if (hookPipeline.onError && result.status === 'error') {
        const hookError = new Error(result.error ?? 'Unknown error');
        const modifiedError = await hookPipeline.onError(context, hookError);
        if (modifiedError) {
          result.error = modifiedError.message;
        }
      }
    }

    // 11. Run afterExecute hooks
    result = await hookPipeline.afterExecute(context, result);

    // 12. Update state
    this.executionCounts.set(agentId, (this.executionCounts.get(agentId) ?? 0) + 1);
    this.lastActivities.set(agentId, Date.now());
    this.lastErrors.set(agentId, result.status === 'error' ? result.error ?? null : null);

    // 13. Set back to idle after delay
    setTimeout(() => {
      this.setStatus(agentId, 'idle');
    }, 1500);

    // 14. Emit cost event to DB
    if (result.status === 'success') {
      this.logCostToDb(agentId, result).catch(console.error);
    }

    return result;
  }

  // ── State Queries ──────────────────────────────────────────

  /**
   * Get a snapshot of an agent's runtime state.
   */
  getState(agentId: string): AgentStateSnapshot {
    return {
      agentId,
      status: agentRegistry.getStatus(agentId),
      lastActivityAt: this.lastActivities.get(agentId) ?? 0,
      currentActivity: null,
      activeTaskId: this.activeTasks.get(agentId) ?? null,
      executionCount: this.executionCounts.get(agentId) ?? 0,
      lastError: this.lastErrors.get(agentId) ?? null,
    };
  }

  /**
   * Get all agent states.
   */
  getAllStates(): AgentStateSnapshot[] {
    return agentRegistry.listIds().map((id) => this.getState(id));
  }

  /**
   * Get execution count for an agent.
   */
  getExecutionCount(agentId: string): number {
    return this.executionCounts.get(agentId) ?? 0;
  }

  // ── Private Helpers ────────────────────────────────────────

  private buildMessages(config: AgentConfig, input: AgentInput): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // System prompt first
    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt });
    }

    // History
    if (input.history && input.history.length > 0) {
      messages.push(...input.history);
    }

    // Current user message
    messages.push({ role: 'user', content: input.message });

    return messages;
  }

  private buildHookPipeline(config: AgentConfig): AgentHook {
    const allHooks: AgentHook[] = [...config.hooks];
    return composeHooks(allHooks);
  }

  private setStatus(agentId: string, status: AgentStatus): void {
    const previousStatus = agentRegistry.getStatus(agentId);
    agentRegistry.setStatus(agentId, status);

    // Emit status change event
    eventBus.emit(EventTypes.AGENT_STATUS_CHANGED, {
      agentId,
      fromStatus: previousStatus,
      toStatus: status,
      timestamp: Date.now(),
      source: 'agent-runtime',
    }).catch(console.error);
  }

  private handleError(
    agentId: string,
    error: unknown,
    resolvedModel: { provider: string; model: string },
    startTime: number,
  ): AgentResult {
    this.setStatus(agentId, 'error');

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown execution error';

    return {
      agentId,
      content: null,
      model: resolvedModel.model,
      resolvedModel: resolvedModel as import('../ai-provider/types').ResolvedModel,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'error',
      durationMs: Date.now() - startTime,
      status: 'error',
      error: errorMessage,
    };
  }

  private async logCostToDb(agentId: string, result: AgentResult): Promise<void> {
    try {
      const { db } = await import('../db');
      const costPerPromptToken = this.getCostPerPromptToken(result.model);
      const costPerCompletionToken = this.getCostPerCompletionToken(result.model);
      const cost =
        result.usage.promptTokens * costPerPromptToken +
        result.usage.completionTokens * costPerCompletionToken;

      await db.costLog.create({
        data: {
          agentId,
          provider: result.resolvedModel.provider,
          model: result.model,
          tokensIn: result.usage.promptTokens,
          tokensOut: result.usage.completionTokens,
          cost,
        },
      });

      await eventBus.emit(EventTypes.COST_LOGGED, {
        costLogId: '',
        agentId,
        provider: result.resolvedModel.provider,
        model: result.model,
        cost,
        timestamp: Date.now(),
        source: 'agent-runtime',
      });
    } catch (error) {
      console.error('[AgentRuntime] Failed to log cost:', error);
    }
  }

  private getCostPerPromptToken(model: string): number {
    if (model.includes('gpt-4o')) return 0.0000025;
    if (model.includes('gpt-4')) return 0.00003;
    if (model.includes('claude-3.5-sonnet') || model.includes('claude-3-5-sonnet')) return 0.000003;
    if (model.includes('gemini-2')) return 0.00000125;
    if (model.includes('llama') || model.includes('mistral')) return 0.0000002;
    return 0.0000005;
  }

  private getCostPerCompletionToken(model: string): number {
    if (model.includes('gpt-4o')) return 0.00001;
    if (model.includes('gpt-4')) return 0.00006;
    if (model.includes('claude-3.5-sonnet') || model.includes('claude-3-5-sonnet')) return 0.000015;
    if (model.includes('gemini-2')) return 0.000005;
    if (model.includes('llama') || model.includes('mistral')) return 0.0000005;
    return 0.000001;
  }
}

export const agentRuntime = AgentRuntime.getInstance();
