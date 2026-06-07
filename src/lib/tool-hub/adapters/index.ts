// ─── Agent OS — Tool Adapters ────────────────────────────────
// Skeleton adapters for all default tools.
// IMPORTANT: No real dangerous execution (no shell, no SQL, no file writes, no deploy).

import type { ToolAdapter, ToolExecutionInput, ToolExecutionOutput } from '../types';

// ─── Filesystem Adapters ─────────────────────────────────────

export const filesystemReadAdapter: ToolAdapter = {
  key: 'filesystem.read',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] Filesystem read executed',
        path: input.input,
        files: ['src/index.ts', 'README.md', 'package.json'],
        content: '// Mock file content for path: ' + JSON.stringify(input.input),
      },
      metadata: { adapter: 'filesystem.read', skeleton: true },
    };
  },
};

export const filesystemWriteAdapter: ToolAdapter = {
  key: 'filesystem.write',
  async execute(_input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    // BLOCKED: Should never reach here — requires approval first
    return {
      success: false,
      error: '[Blocked] Filesystem write requires approval. No files were modified.',
      metadata: { adapter: 'filesystem.write', blocked: true, skeleton: true },
    };
  },
};

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

// ─── Git Adapters ────────────────────────────────────────────

export const gitStatusAdapter: ToolAdapter = {
  key: 'git.status',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] Git status executed',
        branch: 'main',
        status: 'clean',
        staged: [],
        unstaged: [],
        input: input.input,
      },
      metadata: { adapter: 'git.status', skeleton: true },
    };
  },
};

export const gitDiffAdapter: ToolAdapter = {
  key: 'git.diff',
  async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput> {
    return {
      success: true,
      data: {
        message: '[Skeleton] Git diff executed',
        diff: 'No changes detected (mock output)',
        input: input.input,
      },
      metadata: { adapter: 'git.diff', skeleton: true },
    };
  },
};

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

// ─── Adapter Registry ────────────────────────────────────────

const ALL_ADAPTERS: ToolAdapter[] = [
  filesystemReadAdapter,
  filesystemWriteAdapter,
  terminalRunAdapter,
  gitStatusAdapter,
  gitDiffAdapter,
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
];

export const ADAPTER_MAP = new Map<string, ToolAdapter>(
  ALL_ADAPTERS.map((a) => [a.key, a])
);
