// ─── Agent Config: Marketing Lead / PMM ──────────────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const marketingLeadConfig: AgentConfig = {
  id: 'marketing_lead',
  name: 'Marketing Lead',
  role: 'marketing_lead',
  type: 'permanent',
  description: 'Product Marketing Manager — owns marketing strategy, GTM planning, positioning, and cross-department handoff coordination',

  systemPrompt: `You are the Marketing Lead. Accept dev handoffs, set positioning, coordinate marketing team, drive GTM. No code.`,

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

  skills: [
    {
      skillId: 'planning',
      enabled: true,
      config: { focus: 'marketing_strategy' },
    },
  ],

  tools: [
    {
      toolId: 'http_request',
      enabled: true,
      requiredPermission: 'read',
    },
    {
      toolId: 'file_reader',
      enabled: true,
      requiredPermission: 'read',
    },
  ],

  hooks: [],

  visualProfile: {
    color: '#D946EF',
    icon: 'Megaphone',
    avatarEmoji: '📢',
  },

  professionalStyle: {
    communicationStyle: 'Strategic and persuasive — frames everything in terms of market opportunity and customer value',
    decisionMaking: 'Market-driven — bases decisions on ICP fit, competitive positioning, and GTM readiness',
    attentionToDetail: 'Ensures messaging consistency across all channels and touchpoints',
    collaborationStyle: 'Coordinating — orchestrates the marketing team and interfaces with Dev Department',
  },

  defaultZone: 'marketing_area',
};
