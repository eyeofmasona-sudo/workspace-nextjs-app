// ─── Agent Config: Growth & Distribution Agent ───────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const growthManagerConfig: AgentConfig = {
  id: 'growth_manager',
  name: 'Growth Manager',
  role: 'growth_manager',
  type: 'permanent',
  description: 'Growth & Distribution specialist — manages launch execution, channels, campaigns, SEO, and audience acquisition experiments',

  systemPrompt: `You are the Growth Manager. Plan and execute campaigns, distribution, A/B tests, channel optimization. No code.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 1536,
    },
    fallback: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 1536,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.5,
    maxTokens: 1536,
  },

  skills: [
    {
      skillId: 'planning',
      enabled: true,
      config: { focus: 'growth_experiments' },
    },
  ],

  tools: [
    {
      toolId: 'http_request',
      enabled: true,
      requiredPermission: 'read',
    },
    {
      toolId: 'browser_operator',
      enabled: true,
      requiredPermission: 'read',
    },
    {
      toolId: 'calculator',
      enabled: true,
      requiredPermission: 'none',
    },
  ],

  hooks: [],

  visualProfile: {
    color: '#22C55E',
    icon: 'TrendingUp',
    avatarEmoji: '📈',
  },

  professionalStyle: {
    communicationStyle: 'Metrics-focused — talks in funnels, conversions, CAC, and ROI',
    decisionMaking: 'Experiment-driven — runs tests before scaling, data-backed decisions',
    attentionToDetail: 'Tracks attribution, monitors channel performance, catches anomalies early',
    collaborationStyle: 'Action-oriented — coordinates campaigns and syncs with Analytics for measurement',
  },

  defaultZone: 'growth_lab',
};
