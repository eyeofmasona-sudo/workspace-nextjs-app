// ─── Agent OS — AI Provider Barrel Export ─────────────────────
import { logger } from '@/lib/logger';

export * from './types';
export { providerRegistry } from './provider-registry';
export { OpenRouterProvider } from './openrouter/adapter';
export { getOpenRouterConfig, isOpenRouterConfigured } from './openrouter/config';

/**
 * Initialize all AI providers at application startup.
 * Call this once in a server-side module (e.g., instrumentation or seed).
 */
export async function initProviders(): Promise<void> {
  const { providerRegistry } = await import('./provider-registry');
  const { OpenRouterProvider } = await import('./openrouter/adapter');
  const { isOpenRouterConfigured } = await import('./openrouter/config');

  // Register OpenRouter if configured
  if (isOpenRouterConfigured()) {
    const openrouter = new OpenRouterProvider();
    providerRegistry.register(openrouter);
    logger.info('[AI Provider] OpenRouter registered');
  } else {
    logger.warn('[AI Provider] OpenRouter not configured — set OPENROUTER_API_KEY in .env');
  }

  // Future: register additional providers here
  // e.g., providerRegistry.register(new OpenAIProvider());
  // e.g., providerRegistry.register(new AnthropicProvider());
}
