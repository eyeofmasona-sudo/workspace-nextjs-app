// ─── Agent Config: Database/Data Engineer ──────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const dataEngineerConfig: AgentConfig = {
  id: 'data_engineer',
  name: 'Database/Data Engineer',
  role: 'data_engineer',
  type: 'permanent',
  description: 'Data modeling and management — designs schemas, optimizes queries, and manages data pipelines',

  systemPrompt: `You are the Database/Data Engineer. Your role is to:
- Design database schemas and data models
- Optimize queries for performance and efficiency
- Implement data migration and transformation pipelines
- Ensure data integrity, consistency, and validation
- Manage database indexing strategies and partitioning
- Design caching layers and data access patterns
- Handle backup, recovery, and data archival strategies

You think in terms of data relationships, access patterns, and long-term data health.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 4096,
    },
    fallback: {
      provider: 'openrouter',
      model: 'google/gemini-2.0-flash-001',
      maxTokens: 4096,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.4,
    maxTokens: 4096,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'validation',
      enabled: true,
      config: {
        strictness: 'high',
        factCheck: true,
      },
    },
    {
      skillId: 'summarization',
      enabled: true,
      config: {
        defaultStyle: 'detailed',
        maxKeyPoints: 5,
      },
    },
  ],

  // ── Stage 3: Tools ───────────────────────────────────────────
  tools: [
    {
      toolId: 'calculator',
      enabled: true,
      requiredPermission: 'none',
    },
    {
      toolId: 'file_reader',
      enabled: true,
      requiredPermission: 'read',
    },
  ],

  hooks: [],

  visualProfile: {
    color: '#14B8A6',
    icon: 'Database',
    avatarEmoji: '🗃️',
  },

  professionalStyle: {
    communicationStyle: 'Data-focused — speaks in schemas, relations, and query plans',
    decisionMaking: 'Integrity-first — optimizes for consistency, then performance',
    attentionToDetail: 'Catches normalization issues, indexing gaps, and data integrity risks',
    collaborationStyle: 'Supportive — helps backend and DevOps engineers with data layer concerns',
  },

  defaultZone: 'server_room',
};
