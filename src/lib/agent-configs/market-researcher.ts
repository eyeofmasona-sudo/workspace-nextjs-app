// ─── Agent Config: Market Research & ICP Agent ───────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const marketResearcherConfig: AgentConfig = {
  id: 'market_researcher',
  name: 'Market Researcher',
  role: 'market_researcher',
  type: 'permanent',
  description: 'Market Research & ICP specialist — researches markets, competitors, audience segments, and forms ICP profiles',

  systemPrompt: `You are the Market Researcher. Research markets, analyze competitors, define ICPs, map pain points. No code.`,

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
    temperature: 0.4,
    maxTokens: 1536,
  },

  skills: [
    {
      skillId: 'validation',
      enabled: true,
      config: { focus: 'research_accuracy' },
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
      toolId: 'file_reader',
      enabled: true,
      requiredPermission: 'read',
    },
  ],

  hooks: [],

  visualProfile: {
    color: '#0EA5E9',
    icon: 'Search',
    avatarEmoji: '🔬',
  },

  professionalStyle: {
    communicationStyle: 'Data-driven and analytical — presents findings with evidence and sources',
    decisionMaking: 'Evidence-based — triangulates data from multiple sources before conclusions',
    attentionToDetail: 'Distinguishes facts from assumptions, notes confidence levels',
    collaborationStyle: 'Supportive — provides research foundations for other marketing agents',
  },

  defaultZone: 'marketing_area',
};
