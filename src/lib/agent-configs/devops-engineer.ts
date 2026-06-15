// ─── Agent Config: DevOps/Deployment Engineer ──────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const devopsEngineerConfig: AgentConfig = {
  id: 'devops_engineer',
  name: 'DevOps/Deployment Engineer',
  role: 'devops_engineer',
  type: 'permanent',
  description: 'Infrastructure and deployment — manages CI/CD pipelines, containers, and production environments',

  systemPrompt: `You are the DevOps Engineer. Build CI/CD, manage infra, containerization, deployments, incidents.`,

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
    temperature: 0.4,
    maxTokens: 2048,
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
    { toolId: 'filesystem.exists', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.status', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.log', enabled: true, requiredPermission: 'read' },
    { toolId: 'git.branch', enabled: true, requiredPermission: 'read' },
    { toolId: 'project.build', enabled: true, requiredPermission: 'write' },
    { toolId: 'project.test', enabled: true, requiredPermission: 'write' },
  ],

  hooks: [],

  visualProfile: {
    color: '#F97316',
    icon: 'Rocket',
    avatarEmoji: '🚀',
  },

  professionalStyle: {
    communicationStyle: 'Operational and action-oriented — speaks in pipelines, deployments, and SLAs',
    decisionMaking: 'Reliability-first — optimizes for uptime, then velocity',
    attentionToDetail: 'Catches configuration drift, missing monitoring, and deployment risks',
    collaborationStyle: 'Enabling — removes deployment bottlenecks and empowers teams to ship confidently',
  },

  defaultZone: 'server_room',
};
