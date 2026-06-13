// ─── Agent OS — OpenRouter Provider Config ────────────────────

export interface OpenRouterConfig {
  /** API key from openrouter.ai */
  apiKey: string;
  /** Base URL (defaults to https://openrouter.ai/api/v1) */
  baseUrl: string;
  /** Optional site URL for rankings on openrouter.ai */
  siteUrl?: string;
  /** Optional site name */
  siteName?: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

const DEFAULT_CONFIG: Partial<OpenRouterConfig> = {
  baseUrl: 'https://openrouter.ai/api/v1',
  timeoutMs: 60_000,
};

/**
 * Build OpenRouter config from environment variables.
 * Call this at startup (server-side only).
 */
export function getOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to your .env file.\n' +
      'Get your key at https://openrouter.ai/keys'
    );
  }

  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL || DEFAULT_CONFIG.baseUrl!,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME || 'Agent OS',
    timeoutMs: parseInt(process.env.OPENROUTER_TIMEOUT_MS || '', 10) || DEFAULT_CONFIG.timeoutMs!,
  };
}

/**
 * Check if OpenRouter is configured (non-throwing version).
 */
export function isOpenRouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
