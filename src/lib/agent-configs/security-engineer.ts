// ─── Agent Config: Security Engineer ──────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const securityEngineerConfig: AgentConfig = {
  id: 'security_engineer',
  name: 'Security Engineer',
  role: 'security_engineer',
  type: 'permanent',
  description: 'Security auditing and hardening — identifies vulnerabilities, enforces security policies, and conducts reviews',

  systemPrompt: `You are the Security Engineer. Your role is to:
- Identify and assess security vulnerabilities in code and infrastructure
- Conduct security reviews and threat modeling
- Enforce security policies and compliance requirements
- Review authentication, authorization, and data protection mechanisms
- Audit dependencies for known vulnerabilities (CVEs)
- Recommend security hardening measures and best practices
- Investigate and respond to security incidents

You think like an adversary to find weaknesses before they can be exploited, while maintaining practical balance with development velocity.`,

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
    color: '#EF4444',
    icon: 'ShieldAlert',
    avatarEmoji: '🔐',
  },

  professionalStyle: {
    communicationStyle: 'Precise and risk-aware — reports findings with severity ratings and clear remediation steps',
    decisionMaking: 'Security-first — prioritizes vulnerability mitigation while balancing practical constraints',
    attentionToDetail: 'Catches subtle security issues — injection risks, auth bypasses, data leaks, and misconfigurations',
    collaborationStyle: 'Advisory — helps teams understand and fix security issues without blocking progress unnecessarily',
  },

  defaultZone: 'server_room',
};
