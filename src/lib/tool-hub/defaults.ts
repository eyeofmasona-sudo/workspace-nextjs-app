// ─── Agent OS — Default Tool Definitions ─────────────────────
// 15 default tools for the Tool Hub.
// All are skeleton adapters — no real dangerous execution.

import type { ToolConfig } from './types';

export const DEFAULT_TOOLS: ToolConfig[] = [
  // ─── Filesystem ────────────────────────────────────────────
  {
    name: 'Filesystem Read',
    key: 'filesystem.read',
    category: 'filesystem',
    description: 'Read files and directories from the workspace filesystem. Skeleton: returns mock file listing.',
    enabled: true,
    riskLevel: 'low',
    requiresApproval: false,
    policies: [
      { permissionKey: 'files', requiredLevel: 'read' },
    ],
  },
  {
    name: 'Filesystem Write',
    key: 'filesystem.write',
    category: 'filesystem',
    description: 'Write or modify files in the workspace filesystem. Blocked skeleton — requires approval.',
    enabled: true,
    riskLevel: 'high',
    requiresApproval: true,
    policies: [
      { permissionKey: 'files', requiredLevel: 'write' },
    ],
  },

  // ─── Terminal ──────────────────────────────────────────────
  {
    name: 'Terminal Run',
    key: 'terminal.run',
    category: 'terminal',
    description: 'Execute shell commands via terminal. Blocked skeleton — no real commands executed.',
    enabled: true,
    riskLevel: 'critical',
    requiresApproval: true,
    policies: [
      { permissionKey: 'terminal', requiredLevel: 'write' },
    ],
  },

  // ─── Git ──────────────────────────────────────────────────
  {
    name: 'Git Status',
    key: 'git.status',
    category: 'git',
    description: 'Check git repository status. Skeleton: returns mock status output.',
    enabled: true,
    riskLevel: 'low',
    requiresApproval: false,
    policies: [
      { permissionKey: 'git', requiredLevel: 'read' },
    ],
  },
  {
    name: 'Git Diff',
    key: 'git.diff',
    category: 'git',
    description: 'Show git diff of changes. Skeleton: returns mock diff output.',
    enabled: true,
    riskLevel: 'low',
    requiresApproval: false,
    policies: [
      { permissionKey: 'git', requiredLevel: 'read' },
    ],
  },

  // ─── Browser ──────────────────────────────────────────────
  {
    name: 'Browser Search',
    key: 'browser.search',
    category: 'browser',
    description: 'Search the web via browser. Skeleton: returns mock search results.',
    enabled: true,
    riskLevel: 'medium',
    requiresApproval: false,
    policies: [
      { permissionKey: 'browser', requiredLevel: 'read' },
    ],
  },

  // ─── Database ─────────────────────────────────────────────
  {
    name: 'Database Query',
    key: 'database.query',
    category: 'database',
    description: 'Execute database queries. Blocked/approval-ready skeleton — no real SQL executed.',
    enabled: true,
    riskLevel: 'high',
    requiresApproval: true,
    policies: [
      { permissionKey: 'database', requiredLevel: 'write' },
    ],
  },

  // ─── Document ─────────────────────────────────────────────
  {
    name: 'Document Parse',
    key: 'document.parse',
    category: 'document',
    description: 'Parse and extract content from documents. Skeleton: returns mock parsed content.',
    enabled: true,
    riskLevel: 'low',
    requiresApproval: false,
    policies: [
      { permissionKey: 'documents', requiredLevel: 'read' },
    ],
  },

  // ─── OCR ──────────────────────────────────────────────────
  {
    name: 'OCR Extract',
    key: 'ocr.extract',
    category: 'ocr',
    description: 'Extract text from images via OCR. Skeleton: returns mock OCR result.',
    enabled: true,
    riskLevel: 'medium',
    requiresApproval: false,
    policies: [
      { permissionKey: 'ocr', requiredLevel: 'read' },
    ],
  },

  // ─── Translation ──────────────────────────────────────────
  {
    name: 'Translation Translate',
    key: 'translation.translate',
    category: 'translation',
    description: 'Translate text between languages. Skeleton: returns mock translation.',
    enabled: true,
    riskLevel: 'medium',
    requiresApproval: false,
    policies: [
      { permissionKey: 'translation', requiredLevel: 'read' },
    ],
  },

  // ─── RAG ──────────────────────────────────────────────────
  {
    name: 'RAG Index',
    key: 'rag.index',
    category: 'rag',
    description: 'Index documents for RAG retrieval. Skeleton: returns mock index result.',
    enabled: true,
    riskLevel: 'medium',
    requiresApproval: false,
    policies: [
      { permissionKey: 'rag', requiredLevel: 'write' },
    ],
  },
  {
    name: 'RAG Query',
    key: 'rag.query',
    category: 'rag',
    description: 'Query the RAG index for relevant documents. Skeleton: returns mock retrieval result.',
    enabled: true,
    riskLevel: 'low',
    requiresApproval: false,
    policies: [
      { permissionKey: 'rag', requiredLevel: 'read' },
    ],
  },

  // ─── Deployment ───────────────────────────────────────────
  {
    name: 'Deployment Deploy',
    key: 'deployment.deploy',
    category: 'deployment',
    description: 'Deploy application to target environment. Blocked/approval-required skeleton — no real deployment.',
    enabled: true,
    riskLevel: 'critical',
    requiresApproval: true,
    policies: [
      { permissionKey: 'deployment', requiredLevel: 'admin' },
    ],
  },

  // ─── Model Provider ──────────────────────────────────────
  {
    name: 'Model Resolve',
    key: 'model.resolve',
    category: 'model_provider',
    description: 'Resolve model configuration for an agent. Uses AgentModelConfig only, no real API calls.',
    enabled: true,
    riskLevel: 'low',
    requiresApproval: false,
    policies: [], // No permission check — internal tool
  },

  // ─── Notification ────────────────────────────────────────
  {
    name: 'Notification Send',
    key: 'notification.send',
    category: 'notification',
    description: 'Send notifications to users or agents. Skeleton: logs notification without sending.',
    enabled: true,
    riskLevel: 'low',
    requiresApproval: false,
    policies: [], // No permission check — internal tool
  },
];
