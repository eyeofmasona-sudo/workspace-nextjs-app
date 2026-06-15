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

  systemPrompt: `You are the Frontend Engineer. Build React/Next.js UIs, components, state management, performance.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 2048,
    },
    fallback: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 2048,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.5,
    maxTokens: 2048,
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
  
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.write', enabled: true, requiredPermission: 'write' },
    { toolId: 'filesystem.list', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.status', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.build', enabled: true, requiredPermission: 'write' },
    { toolId: 'project.typecheck', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.lint', enabled: true, requiredPermission: 'read' },
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
