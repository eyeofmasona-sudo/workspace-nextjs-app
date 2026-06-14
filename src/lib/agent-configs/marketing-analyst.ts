// ─── Agent Config: Analytics & Feedback Loop Agent ───────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const marketingAnalystConfig: AgentConfig = {
  id: 'marketing_analyst',
  name: 'Marketing Analyst',
  role: 'marketing_analyst',
  type: 'permanent',
  description: 'Analytics & Feedback Loop specialist — measures KPIs, collects market signals, and sends structured feedback to orchestrator and Dev Department',

  systemPrompt: `You are the Marketing Analyst. Track KPIs, analyze campaigns, generate insights, close product feedback loop. No code.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 1536,
    },
    fallback: {
      provider: 'openrouter',
      model: 'google/gemini-2.0-flash-exp',
      maxTokens: 1536,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.3,
    maxTokens: 1536,
  },

  skills: [
    {
      skillId: 'validation',
      enabled: true,
      config: { focus: 'data_accuracy' },
    },
    {
      skillId: 'summarization',
      enabled: true,
      config: { style: 'executive_summary' },
    },
  ],

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
    {
      toolId: 'file_reader',
      enabled: true,
      requiredPermission: 'read',
    },
  ],

  hooks: [],

  visualProfile: {
    color: '#06B6D4',
    icon: 'BarChart3',
    avatarEmoji: '📊',
  },

  professionalStyle: {
    communicationStyle: 'Analytical and precise — presents data with context and confidence intervals',
    decisionMaking: 'Data-driven — requires statistical significance before drawing conclusions',
    attentionToDetail: 'Ensures data quality, validates sources, notes methodological limitations',
    collaborationStyle: 'Bridging — connects marketing insights back to product and engineering teams',
  },

  defaultZone: 'growth_lab',
};
