// HTTP client for Next.js /api/orchestrator/chat endpoint
// Runs as a separate process — communicates over local HTTP

import { HistoryMessage } from './session';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? 'http://localhost:3000/api/orchestrator/chat';
const REQUEST_TIMEOUT_MS = parseInt(process.env.ORCHESTRATOR_TIMEOUT_MS ?? '120000', 10); // 2 min

export interface OrchestratorResult {
  response: string;
  delegatedTasks: Array<{ agentId: string; task: string; status: string }>;
  totalDurationMs: number;
  modelUsed: string;
  tokensUsed: number;
}

export class OrchestratorClient {
  private workspaceId: string | null = null;

  async fetchWorkspaceId(): Promise<string | null> {
    if (this.workspaceId) return this.workspaceId;
    try {
      const res = await fetch('http://localhost:3000/api/agents?limit=1', {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const data = await res.json() as { agents?: Array<{ workspaceId: string }> };
      this.workspaceId = data.agents?.[0]?.workspaceId ?? null;
      return this.workspaceId;
    } catch {
      return null;
    }
  }

  async chat(
    message: string,
    history: HistoryMessage[],
  ): Promise<OrchestratorResult> {
    const workspaceId = await this.fetchWorkspaceId();

    const body = {
      message,
      history: history.map((h) => ({ role: h.role, content: h.content })),
      mode: 'auto',
      ...(workspaceId ? { workspaceId } : {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(ORCHESTRATOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Orchestrator timeout after ${REQUEST_TIMEOUT_MS / 1000}s`);
      }
      throw new Error(`Cannot reach orchestrator at ${ORCHESTRATOR_URL}: ${String(err)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json() as { error?: string };
        detail = errBody?.error ?? '';
      } catch {}
      throw new Error(`Orchestrator HTTP ${res.status}${detail ? ': ' + detail : ''}`);
    }

    const data = await res.json() as {
      orchestratorResponse?: string;
      delegatedTasks?: Array<{ agentId: string; task: string; status: string }>;
      totalDurationMs?: number;
      modelUsed?: string;
      usage?: { totalTokens: number };
    };

    return {
      response: data.orchestratorResponse ?? '(no response)',
      delegatedTasks: data.delegatedTasks ?? [],
      totalDurationMs: data.totalDurationMs ?? 0,
      modelUsed: data.modelUsed ?? 'unknown',
      tokensUsed: data.usage?.totalTokens ?? 0,
    };
  }
}

export const orchestratorClient = new OrchestratorClient();
