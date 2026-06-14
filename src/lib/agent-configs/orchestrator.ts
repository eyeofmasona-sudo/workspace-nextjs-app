// ─── Agent Config: Orchestrator ─────────────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const orchestratorConfig: AgentConfig = {
  id: 'orchestrator',
  name: 'Orchestrator',
  role: 'orchestrator',
  type: 'permanent',
  description: 'Central coordinator — breaks down tasks, assigns to specialists, monitors progress',

  systemPrompt: `You are the Orchestrator. Break down requests, delegate to specialists, don't execute directly. Be concise.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 2048,
    },
    fallback: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 2048,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.6,
    maxTokens: 2048,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'planning',
      enabled: true,
      config: {
        defaultStepCount: 5,
        autoPrioritize: true,
      },
    },
    {
      skillId: 'validation',
      enabled: true,
      config: {
        strictness: 'high',
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
      toolId: 'http_request',
      enabled: true,
      requiredPermission: 'read',
    },
  ],

  hooks: [],

  visualProfile: {
    color: '#8B5CF6',
    icon: 'Crown',
    avatarEmoji: '👑',
  },

  professionalStyle: {
    communicationStyle: 'Strategic and coordinating — speaks in clear directives and summaries',
    decisionMaking: 'System-level — considers project-wide impact and resource allocation',
    attentionToDetail: 'Focuses on big-picture alignment rather than micro-details',
    collaborationStyle: 'Facilitative — brings agents together and resolves conflicts',
  },

  defaultZone: 'command_area',
};
