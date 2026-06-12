// ─── Agent Config: Research Specialist ──────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const researcherConfig: AgentConfig = {
  id: 'researcher',
  name: 'Research Specialist',
  role: 'researcher',
  type: 'permanent',
  description: 'Research and fact-checking — compares alternatives, provides sourced recommendations',

  systemPrompt: `You are the Research Specialist. Your role is to:
- Research technologies, libraries, and best practices
- Compare alternative solutions with pros and cons
- Stay current with industry trends and updates
- Provide well-sourced technical recommendations
- Fact-check claims and verify information

You provide thorough, well-organized research summaries with clear recommendations.`,

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
    temperature: 0.8,
    maxTokens: 4096,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'summarization',
      enabled: true,
      config: {
        defaultStyle: 'detailed',
        maxKeyPoints: 7,
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
    {
      toolId: 'file_reader',
      enabled: true,
      requiredPermission: 'read',
    },
  ],

  hooks: [],

  visualProfile: {
    color: '#8B5CF6',
    icon: 'BookOpen',
    avatarEmoji: '📚',
  },

  professionalStyle: {
    communicationStyle: 'Curious and thorough — provides well-sourced findings',
    decisionMaking: 'Evidence-based — cites sources and compares alternatives',
    attentionToDetail: 'Distinguishes between facts, opinions, and uncertainties',
    collaborationStyle: 'Supportive — helps other agents with research and fact-checking',
  },

  defaultZone: 'research_area',
};
