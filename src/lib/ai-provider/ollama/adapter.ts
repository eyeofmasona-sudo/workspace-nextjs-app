import type { AIProvider, CompletionRequest, CompletionResponse, ModelInfo, TokenUsage, ToolCall } from '../types';
import { ProviderError } from '../types';
import { getOllamaConfig } from './config';

interface OllamaChatResponse {
  model: string;
  message?: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama Local';

  async isAvailable(): Promise<boolean> {
    const cfg = getOllamaConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(`${cfg.baseUrl}/api/tags`, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const cfg = getOllamaConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const response = await fetch(`${cfg.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: request.model || cfg.defaultModel,
          messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
          stream: false,
          tools: request.tools?.map((tool) => tool.function),
          options: {
            temperature: request.temperature,
            top_p: request.topP,
            num_predict: request.maxTokens,
            stop: request.stop,
          },
        }),
      });

      if (!response.ok) {
        throw new ProviderError(`Ollama error (${response.status})`, this.id, response.status === 404 ? 'MODEL_NOT_FOUND' : 'PROVIDER_UNAVAILABLE', response.status, response.status >= 500);
      }

      const data = (await response.json()) as OllamaChatResponse;
      const usage: TokenUsage = {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      };
      const toolCalls: ToolCall[] | undefined = data.message?.tool_calls?.map((tool, index) => ({
        id: `ollama-${Date.now()}-${index}`,
        type: 'function',
        function: { name: tool.function.name, arguments: JSON.stringify(tool.function.arguments ?? {}) },
      }));

      return {
        content: data.message?.content ?? null,
        model: data.model || request.model,
        finishReason: data.done_reason ?? 'stop',
        usage,
        toolCalls,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError(`Ollama request timed out after ${cfg.timeoutMs}ms`, this.id, 'TIMEOUT', undefined, true);
      }
      throw new ProviderError(error instanceof Error ? error.message : 'Unknown Ollama error', this.id, 'UNKNOWN');
    } finally {
      clearTimeout(timer);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const cfg = getOllamaConfig();
    const response = await fetch(`${cfg.baseUrl}/api/tags`);
    if (!response.ok) throw new ProviderError('Unable to list Ollama models', this.id, 'PROVIDER_UNAVAILABLE', response.status, true);
    const data = await response.json() as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((model) => ({ id: model.name, name: model.name, provider: this.id, capabilities: ['chat', 'tools'] }));
  }
}
