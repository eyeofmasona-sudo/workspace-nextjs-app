// ─── Agent OS — OpenRouter Provider Adapter ───────────────────
// Implements AIProvider for OpenRouter's chat completions API.
// OpenRouter normalizes access to 200+ models through a single API.

import type {
  AIProvider,
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  TokenUsage,
  ToolCall,
} from '../types';
import { ProviderError } from '../types';
import { getOpenRouterConfig, isOpenRouterConfigured } from './config';
import type { OpenRouterConfig } from './config';

// ─── OpenRouter API response shape ───────────────────────────

interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: string | null;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: OpenRouterUsage;
}

interface OpenRouterModelError {
  error?: {
    message: string;
    code?: number;
    type?: string;
  };
}

// ─── OpenRouter Adapter ──────────────────────────────────────

export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';

  private config: OpenRouterConfig | null = null;

  private getConfig(): OpenRouterConfig {
    if (!this.config) {
      this.config = getOpenRouterConfig();
    }
    return this.config;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!isOpenRouterConfigured()) return false;
      const cfg = this.getConfig();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await fetch(`${cfg.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${cfg.apiKey}` },
          signal: controller.signal,
        });
        return res.ok;
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return false;
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const cfg = this.getConfig();
    const startTime = Date.now();

    // Build OpenRouter-compatible request body
    const body = this.buildRequestBody(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          ...(cfg.siteUrl ? { 'HTTP-Referer': cfg.siteUrl } : {}),
          ...(cfg.siteName ? { 'X-Title': cfg.siteName } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        await this.handleError(res, request.model);
      }

      const data = (await res.json()) as OpenRouterResponse;
      const choice = data.choices?.[0];

      if (!choice) {
        throw new ProviderError(
          'No choices returned from OpenRouter',
          this.id,
          'PROVIDER_UNAVAILABLE',
          res.status,
          true,
        );
      }

      const usage: TokenUsage = {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      };

      const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));

      const elapsed = Date.now() - startTime;
      console.log(
        `[OpenRouter] ${request.model} → ${usage.totalTokens} tokens in ${elapsed}ms ` +
        `(finish: ${choice.finish_reason})`
      );

      return {
        content: choice.message.content,
        model: data.model,
        finishReason: choice.finish_reason,
        usage,
        toolCalls,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError(
          `Request timed out after ${cfg.timeoutMs}ms`,
          this.id,
          'TIMEOUT',
          undefined,
          true,
        );
      }

      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.id,
        'UNKNOWN',
        undefined,
        false,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const cfg = this.getConfig();

    const res = await fetch(`${cfg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });

    if (!res.ok) {
      throw new ProviderError(
        `Failed to list models: ${res.status}`,
        this.id,
        'PROVIDER_UNAVAILABLE',
        res.status,
      );
    }

    const data = await res.json();
    const models: ModelInfo[] = (data.data || []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: (m.name || m.id) as string,
      provider: (m.id as string).split('/')[0] || 'unknown',
      contextLength: m.context_length as number | undefined,
    }));

    return models;
  }

  // ─── Private helpers ─────────────────────────────────────

  private buildRequestBody(request: CompletionRequest): Record<string, unknown> {
    const messages = request.messages.map((msg: ChatMessage) => {
      const m: Record<string, unknown> = { role: msg.role, content: msg.content };
      if (msg.toolCallId) m.tool_call_id = msg.toolCallId;
      if (msg.toolCalls) m.tool_calls = msg.toolCalls;
      return m;
    });

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
    };

    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stop !== undefined) body.stop = request.stop;

    // Extension point: tools (reserved for future skills/tools stage)
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }
    if (request.toolChoice) {
      body.tool_choice = request.toolChoice;
    }

    // Merge any provider-specific options
    if (request.providerOptions) {
      Object.assign(body, request.providerOptions);
    }

    return body;
  }

  private async handleError(res: Response, model: string): Promise<never> {
    let errorMessage = `OpenRouter API error (${res.status})`;
    let errorCode: import('../types').ProviderErrorCode = 'UNKNOWN';
    let retryable = false;

    try {
      const data = (await res.json()) as OpenRouterModelError;
      if (data.error) {
        errorMessage = data.error.message || errorMessage;
      }
    } catch {
      // Use default error message
    }

    switch (res.status) {
      case 401:
        errorCode = 'AUTH_FAILED';
        break;
      case 429:
        errorCode = 'RATE_LIMITED';
        retryable = true;
        break;
      case 404:
        errorCode = 'MODEL_NOT_FOUND';
        errorMessage = `Model not found: ${model}. Check the model ID at openrouter.ai/models`;
        break;
      case 400:
        errorCode = 'INVALID_REQUEST';
        break;
      case 503:
      case 502:
        errorCode = 'PROVIDER_UNAVAILABLE';
        retryable = true;
        break;
      default:
        break;
    }

    throw new ProviderError(errorMessage, this.id, errorCode, res.status, retryable);
  }
}
