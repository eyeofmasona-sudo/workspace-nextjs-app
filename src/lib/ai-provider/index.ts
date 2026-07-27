// ─── Agent OS — AI Provider Barrel Export ─────────────────────
import { logger } from '@/lib/logger';

export * from './types';
export { providerRegistry } from './provider-registry';
export { OpenRouterProvider } from './openrouter/adapter';
export { getOpenRouterConfig, isOpenRouterConfigured } from './openrouter/config';
export { OllamaProvider } from './ollama/adapter';
export { getOllamaConfig, isOllamaConfigured } from './ollama/config';

/** Initialize configured cloud and local model providers once. */
export async function initProviders(): Promise<void> {
  const { providerRegistry } = await import('./provider-registry');
  const { OpenRouterProvider } = await import('./openrouter/adapter');
  const { isOpenRouterConfigured } = await import('./openrouter/config');
  const { OllamaProvider } = await import('./ollama/adapter');
  const { isOllamaConfigured } = await import('./ollama/config');

  if (isOpenRouterConfigured() && !providerRegistry.has('openrouter')) {
    providerRegistry.register(new OpenRouterProvider());
    logger.info('[AI Provider] OpenRouter registered');
  }

  if (isOllamaConfigured() && !providerRegistry.has('ollama')) {
    providerRegistry.register(new OllamaProvider());
    logger.info('[AI Provider] Ollama local provider registered');
  }

  if (!isOpenRouterConfigured()) {
    logger.warn('[AI Provider] OpenRouter not configured; local Ollama remains available when running');
  }
}
