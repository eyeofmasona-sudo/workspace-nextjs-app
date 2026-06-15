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

  systemPrompt: `You are the QA Engineer. Design tests, write test cases, find edge cases, report bugs with reproduction steps.`,

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
    temperature: 0.3,
    maxTokens: 1536,
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
  
    { toolId: 'filesystem.read', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.diff', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.status', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.test', enabled: true, requiredPermission: 'write' },
    { toolId: 'project.lint', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.typecheck', enabled: true, requiredPermission: 'read' },
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
