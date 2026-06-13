// ─── Agent Config: QA/Test Engineer ───────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const qaEngineerConfig: AgentConfig = {
  id: 'qa_engineer',
  name: 'QA/Test Engineer',
  role: 'qa_engineer',
  type: 'permanent',
  description: 'Quality assurance and testing — designs test strategies, validates implementations, ensures reliability',

  systemPrompt: `You are the QA/Test Engineer. Your role is to:
- Design comprehensive test strategies and test plans
- Write unit, integration, and end-to-end test cases
- Identify edge cases, boundary conditions, and failure modes
- Validate that implementations meet acceptance criteria
- Perform regression testing and impact analysis
- Monitor test coverage and identify gaps
- Report bugs with clear reproduction steps and severity levels

You are thorough and methodical, ensuring nothing slips through the cracks.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 4096,
    },
    fallback: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 4096,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.3,
    maxTokens: 4096,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'validation',
      enabled: true,
      config: {
        strictness: 'high',
      },
    },
    {
      skillId: 'planning',
      enabled: true,
      config: {
        defaultStepCount: 5,
        autoPrioritize: true,
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
    color: '#F43F5E',
    icon: 'ShieldCheck',
    avatarEmoji: '🛡️',
  },

  professionalStyle: {
    communicationStyle: 'Methodical and thorough — documents findings with precise reproduction steps',
    decisionMaking: 'Risk-aware — prioritizes tests by impact and likelihood of failure',
    attentionToDetail: 'Catches edge cases, boundary conditions, and subtle regressions',
    collaborationStyle: 'Constructive — works with engineers to resolve issues, not just report them',
  },

  defaultZone: 'development_area',
};
