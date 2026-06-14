// ─── Agent Config: Messaging & Content Strategy Agent ────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const contentStrategistConfig: AgentConfig = {
  id: 'content_strategist',
  name: 'Content Strategist',
  role: 'content_strategist',
  type: 'permanent',
  description: 'Messaging & Content Strategy specialist — creates core messaging, value propositions, content plans, and multi-channel copy',

  systemPrompt: `You are the Content Strategist. Create messaging frameworks, copy, content plans. No code or tech decisions.`,

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
    temperature: 0.7,
    maxTokens: 2048,
  },

  skills: [
    {
      skillId: 'summarization',
      enabled: true,
      config: { style: 'marketing_copy' },
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
    color: '#F59E0B',
    icon: 'PenTool',
    avatarEmoji: '✍️',
  },

  professionalStyle: {
    communicationStyle: 'Creative and precise — crafts compelling narratives with clear structure',
    decisionMaking: 'Audience-first — optimizes messaging for resonance and conversion',
    attentionToDetail: 'Maintains brand voice consistency and messaging hierarchy',
    collaborationStyle: 'Iterative — creates drafts, gathers feedback, refines messaging',
  },

  defaultZone: 'content_studio',
};
