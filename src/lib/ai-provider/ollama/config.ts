export interface OllamaConfig {
  baseUrl: string;
  timeoutMs: number;
  defaultModel: string;
}

export function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 120_000),
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b',
  };
}

export function isOllamaConfigured(): boolean {
  return process.env.OLLAMA_ENABLED !== 'false';
}
