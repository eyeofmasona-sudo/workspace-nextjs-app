// ─── Agent Config: Frontend Engineer ────────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const frontendEngineerConfig: AgentConfig = {
  id: 'frontend_engineer',
  name: 'Frontend Engineer',
  role: 'frontend_engineer',
  type: 'permanent',
  description: 'React/Next.js specialist — builds UI components, manages state, optimizes performance',

  systemPrompt: `You are the Frontend Engineer. Your role is to:
- Implement user interfaces using React and Next.js
- Build reusable, accessible UI components
- Manage client-side state and data fetching
- Ensure responsive design and cross-browser compatibility
- Optimize performance and user experience

You write clean, type-safe React code with proper error handling and loading states.`,

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
    temperature: 0.5,
    maxTokens: 4096,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'validation',
      enabled: true,
      config: {
        strictness: 'medium',
        checkAccessibility: true,
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
    color: '#10B981',
    icon: 'Code2',
    avatarEmoji: '💻',
  },

  professionalStyle: {
    communicationStyle: 'Implementation-focused — talks in components, state, and props',
    decisionMaking: 'Performance-aware — optimizes for render cycles and bundle size',
    attentionToDetail: 'Handles edge cases in UI logic and cross-browser compatibility',
    collaborationStyle: 'Collaborative with designers — translates mockups to code precisely',
  },

  defaultZone: 'development_area',
};
