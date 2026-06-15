// ─── Agent OS — Tool Adapters ────────────────────────────────
// Real adapters for filesystem, git, and project tools.
// Skeleton stubs retained for unimplemented tools.

import type { ToolAdapter, ToolExecutionInput, ToolExecutionOutput } from '../types';

// ─── Real Filesystem Adapters ────────────────────────────────
export {
  filesystemReadAdapter,
  filesystemWriteAdapter,
  filesystemListAdapter,
  filesystemExistsAdapter,
  filesystemSearchAdapter,
} from './filesystem';

// ─── Real Git Adapters ───────────────────────────────────────
export {
  gitStatusAdapter,
  gitDiffAdapter,
  gitBranchAdapter,
  gitLogAdapter,
} from './git';

// ─── Real Project Adapters ───────────────────────────────────
export {
  projectBuildAdapter,
  projectTypecheckAdapter,
  projectLintAdapter,
  projectTestAdapter,
} from './project';

// ─── Local re-imports for ALL_ADAPTERS array ─────────────────
import {
  filesystemReadAdapter,
  filesystemWriteAdapter,
  filesystemListAdapter,
  filesystemExistsAdapter,
  filesystemSearchAdapter,
} from './filesystem';
import {
  gitStatusAdapter,
  gitDiffAdapter,
  gitBranchAdapter,
  gitLogAdapter,
} from './git';
import {
  projectBuildAdapter,
  projectTypecheckAdapter,
  projectLintAdapter,
  projectTestAdapter,
} from './project';

// ─── Terminal Adapter ────────────────────────────────────────

export const terminalRunAdapter: ToolAdapter = {
  key: 'terminal.run',
  async execute(_input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    // BLOCKED: Should never reach here — requires approval first
    return {
      success: false,
      error: '[Blocked] Terminal execution requires approval. No commands were run.',
      metadata: { adapter: 'terminal.run', blocked: true, skeleton: true },
    };
  },
};


// ─── Browser Search (Skeleton) ──────────────────────────────
// ─── Browser Adapter ─────────────────────────────────────────

export const browserSearchAdapter: ToolAdapter = {
  key: 'browser.search',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] Browser search executed',
        query: input.input,
        results: [
          { title: 'Mock Search Result 1', url: 'https://example.com/1', snippet: 'This is a mock search result.' },
          { title: 'Mock Search Result 2', url: 'https://example.com/2', snippet: 'Another mock result.' },
        ],
      },
      metadata: { adapter: 'browser.search', skeleton: true },
    };
  },
};

// ─── Database Adapter ────────────────────────────────────────

export const databaseQueryAdapter: ToolAdapter = {
  key: 'database.query',
  async execute(_input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    // BLOCKED: Should never reach here — requires approval first
    return {
      success: false,
      error: '[Blocked] Database query requires approval. No SQL was executed.',
      metadata: { adapter: 'database.query', blocked: true, skeleton: true },
    };
  },
};

// ─── Document Adapter ────────────────────────────────────────

export const documentParseAdapter: ToolAdapter = {
  key: 'document.parse',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] Document parse executed',
        input: input.input,
        extractedText: 'Mock extracted document content. This is a skeleton adapter.',
        pageCount: 1,
        format: 'pdf',
      },
      metadata: { adapter: 'document.parse', skeleton: true },
    };
  },
};

// ─── OCR Adapter ─────────────────────────────────────────────

export const ocrExtractAdapter: ToolAdapter = {
  key: 'ocr.extract',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] OCR extract executed',
        input: input.input,
        extractedText: 'Mock OCR extracted text from image.',
        confidence: 0.95,
        language: 'en',
      },
      metadata: { adapter: 'ocr.extract', skeleton: true },
    };
  },
};

// ─── Translation Adapter ─────────────────────────────────────

export const translationTranslateAdapter: ToolAdapter = {
  key: 'translation.translate',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] Translation executed',
        input: input.input,
        translatedText: 'Mock translated text output.',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      },
      metadata: { adapter: 'translation.translate', skeleton: true },
    };
  },
};

// ─── RAG Adapters ────────────────────────────────────────────

export const ragIndexAdapter: ToolAdapter = {
  key: 'rag.index',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] RAG index executed',
        input: input.input,
        documentsIndexed: 0,
        chunksCreated: 0,
        indexStatus: 'mock_complete',
      },
      metadata: { adapter: 'rag.index', skeleton: true },
    };
  },
};

export const ragQueryAdapter: ToolAdapter = {
  key: 'rag.query',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] RAG query executed',
        input: input.input,
        results: [
          { content: 'Mock RAG retrieval result 1', score: 0.92, source: 'doc1.md' },
          { content: 'Mock RAG retrieval result 2', score: 0.85, source: 'doc2.md' },
        ],
      },
      metadata: { adapter: 'rag.query', skeleton: true },
    };
  },
};

// ─── Deployment Adapter ──────────────────────────────────────

export const deploymentDeployAdapter: ToolAdapter = {
  key: 'deployment.deploy',
  async execute(_input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    // BLOCKED: Should never reach here — requires approval first
    return {
      success: false,
      error: '[Blocked] Deployment requires approval. No deployment was executed.',
      metadata: { adapter: 'deployment.deploy', blocked: true, skeleton: true },
    };
  },
};

// ─── Model Resolve Adapter ──────────────────────────────────

export const modelResolveAdapter: ToolAdapter = {
  key: 'model.resolve',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    // This adapter uses AgentModelConfig to resolve — no real API calls
    return {
      success: true,
      data: {
        message: '[Skeleton] Model resolve executed',
        agentId: input.agentId,
        resolvedModel: null, // Will be populated by ToolHub using AgentModelConfigService
        input: input.input,
      },
      metadata: { adapter: 'model.resolve', skeleton: true },
    };
  },
};

// ─── Notification Adapter ────────────────────────────────────

export const notificationSendAdapter: ToolAdapter = {
  key: 'notification.send',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] Notification sent (logged only)',
        input: input.input,
        delivered: true,
        channel: 'log',
      },
      metadata: { adapter: 'notification.send', skeleton: true },
    };
  },
};

// ─── Browser AI Provider Adapter ─────────────────────────────
// Real adapter — delegates to BrowserOperatorService.
// Creates a BrowserOperator task and links it to the ToolExecution.

export const browserAiProviderAdapter: ToolAdapter = {
  key: 'browser_ai_provider',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    // Lazy import to avoid pulling playwright into the module graph at build time
    const { getBrowserOperatorService } = await import('@/lib/browser-operator');

    const typedInput = input.input as Record<string, unknown> ?? {};

    try {
      const service = getBrowserOperatorService();
      const task = await service.submitTask({
        provider: (typedInput.provider as string) ?? 'custom',
        prompt: (typedInput.prompt as string) ?? '',
        url: typedInput.url as string | undefined,
        mode: (typedInput.mode as 'navigate' | 'extract' | 'interact' | 'automate') ?? 'extract',
        agentId: input.agentId,
        taskId: input.taskId,
        priority: (typedInput.priority as 'low' | 'normal' | 'high' | 'critical') ?? 'normal',
        timeout: typedInput.timeout as number | undefined,
        options: typedInput.options as Record<string, unknown> | undefined,
      });

      // Poll for result with timeout (max 60s wait for async task)
      const maxWaitMs = 60_000;
      const pollIntervalMs = 1000;
      const startMs = Date.now();
      let completedTask = service.getTask(task.id);

      while (completedTask && Date.now() - startMs < maxWaitMs) {
        const status = completedTask.output.status;
        if (status === 'completed' || status === 'failed' || status === 'needs_human' || status === 'cancelled') {
          break;
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        completedTask = service.getTask(task.id);
      }

      if (!completedTask) {
        return {
          success: false,
          error: 'Task disappeared during execution',
          metadata: { adapter: 'browser_ai_provider', taskId: task.id },
        };
      }

      const isTerminal = ['completed', 'failed', 'needs_human', 'cancelled'].includes(completedTask.output.status);

      if (completedTask.output.status === 'needs_human') {
        // NOT a failure — return special state so orchestrator knows to wait
        return {
          success: true, // Not failed — needs manual intervention
          data: {
            taskId: task.id,
            status: 'needs_human',
            needsHumanReason: completedTask.output.needsHumanReason,
            message: `Browser task paused: ${completedTask.output.needsHumanReason}. Use POST /api/browser-operator/tasks/${task.id}/resume after manual intervention.`,
            screenshots: completedTask.output.screenshots,
            supportsManualTakeover: true,
          },
          metadata: {
            adapter: 'browser_ai_provider',
            taskId: task.id,
            status: 'needs_human',
            executionType: 'async',
          },
        };
      }

      return {
        success: completedTask.output.status === 'completed',
        data: {
          taskId: task.id,
          status: completedTask.output.status,
          result: completedTask.output.result,
          screenshots: completedTask.output.screenshots,
          logs: completedTask.output.logs,
          finalUrl: completedTask.output.finalUrl,
        },
        error: completedTask.output.error ?? undefined,
        metadata: {
          adapter: 'browser_ai_provider',
          taskId: task.id,
          executionType: 'async',
          supportsManualTakeover: true,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Browser AI Provider error: ${msg}`,
        metadata: { adapter: 'browser_ai_provider', error: msg },
      };
    }
  },
};

// ─── Adapter Registry ────────────────────────────────────────

const ALL_ADAPTERS: ToolAdapter[] = [
  // ── Real: Filesystem ──
  filesystemReadAdapter,
  filesystemWriteAdapter,
  filesystemListAdapter,
  filesystemExistsAdapter,
  filesystemSearchAdapter,
  // ── Real: Git ──
  gitStatusAdapter,
  gitDiffAdapter,
  gitBranchAdapter,
  gitLogAdapter,
  // ── Real: Project ──
  projectBuildAdapter,
  projectTypecheckAdapter,
  projectLintAdapter,
  projectTestAdapter,
  // ── Skeleton: Terminal (blocked) ──
  terminalRunAdapter,
  // ── Skeleton: Other tools ──
  browserSearchAdapter,
  databaseQueryAdapter,
  documentParseAdapter,
  ocrExtractAdapter,
  translationTranslateAdapter,
  ragIndexAdapter,
  ragQueryAdapter,
  deploymentDeployAdapter,
  modelResolveAdapter,
  notificationSendAdapter,
  // ── Real: Browser ──
  browserAiProviderAdapter,
];

export const ADAPTER_MAP = new Map<string, ToolAdapter>(
  ALL_ADAPTERS.map((a) => [a.key, a])
);
