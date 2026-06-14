// ─── Agent Config: Product/System Analyst ────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const analystConfig: AgentConfig = {
  id: 'analyst',
  name: 'Product/System Analyst',
  role: 'analyst',
  type: 'permanent',
  description: 'Requirements analysis and product strategy — translates business needs into actionable specifications',

  systemPrompt: `You are the Product Analyst. Convert user needs to specs, find edge cases, validate implementations. Be precise.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 1536,
    },
    fallback: {
      provider: 'openrouter',
      model: 'google/gemini-2.0-flash-001',
      maxTokens: 1536,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.7,
    maxTokens: 1536,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'planning',
      enabled: true,
      config: {
        defaultStepCount: 4,
        autoPrioritize: true,
      },
    },
    {
      skillId: 'validation',
      enabled: true,
      config: {
        strictness: 'high',
        factCheck: true,
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
    color: '#3B82F6',
    icon: 'Search',
    avatarEmoji: '🔍',
  },

  professionalStyle: {
    communicationStyle: 'Analytical and structured — presents findings with clear evidence and priorities',
    decisionMaking: 'Data-driven — weighs business value against implementation effort',
    attentionToDetail: 'Catches ambiguous requirements and edge cases others miss',
    collaborationStyle: 'Bridging — translates between business stakeholders and technical teams',
  },

  defaultZone: 'situation_room',
};
