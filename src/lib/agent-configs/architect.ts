// ─── Agent Config: Software Architect ───────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const architectConfig: AgentConfig = {
  id: 'architect',
  name: 'Software Architect',
  role: 'architect',
  type: 'permanent',
  description: 'System design and architecture — defines technical strategies, patterns, and infrastructure decisions',

  systemPrompt: `You are the Software Architect. Design systems, define patterns, evaluate tech choices. Think in systems.`,

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
    temperature: 0.5,
    maxTokens: 2048,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'planning',
      enabled: true,
      config: {
        defaultStepCount: 6,
        autoPrioritize: true,
      },
    },
    {
      skillId: 'validation',
      enabled: true,
      config: {
        strictness: 'high',
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
    { toolId: 'filesystem.list', enabled: true, requiredPermission: 'read' },
    { toolId: 'filesystem.search', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.log', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.branch', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.typecheck', enabled: true, requiredPermission: 'read' },
  ],

  hooks: [],

  visualProfile: {
    color: '#F59E0B',
    icon: 'Building2',
    avatarEmoji: '🏗️',
  },

  professionalStyle: {
    communicationStyle: 'Strategic and precise — uses diagrams and patterns to convey complex ideas',
    decisionMaking: 'System-level — considers scalability, maintainability, and long-term impact',
    attentionToDetail: 'Focuses on integration points and failure modes in system design',
    collaborationStyle: 'Mentoring — guides teams through architectural decisions with clear rationale',
  },

  defaultZone: 'meeting_room',
};
