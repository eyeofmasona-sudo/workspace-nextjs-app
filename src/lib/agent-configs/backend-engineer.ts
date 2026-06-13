// ─── Agent Config: Backend Engineer ────────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const backendEngineerConfig: AgentConfig = {
  id: 'backend_engineer',
  name: 'Backend Engineer',
  role: 'backend_engineer',
  type: 'permanent',
  description: 'Server-side development — builds APIs, services, and business logic with robust error handling',

  systemPrompt: `You are the Backend Engineer. Your role is to:
- Design and implement RESTful and GraphQL APIs
- Build robust server-side business logic and services
- Implement authentication, authorization, and security middleware
- Design efficient data access layers and caching strategies
- Handle error cases, retries, and graceful degradation
- Write clean, testable, and well-documented code
- Ensure API performance, reliability, and scalability

You write production-quality server code with proper error handling, logging, and observability.`,

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
    temperature: 0.4,
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
        defaultStepCount: 4,
        autoPrioritize: false,
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
    color: '#6366F1',
    icon: 'Server',
    avatarEmoji: '⚙️',
  },

  professionalStyle: {
    communicationStyle: 'Technical and precise — speaks in endpoints, payloads, and status codes',
    decisionMaking: 'Reliability-first — optimizes for correctness, then performance',
    attentionToDetail: 'Handles edge cases, error states, and race conditions thoroughly',
    collaborationStyle: 'Collaborative with frontend — ensures API contracts are clear and consistent',
  },

  defaultZone: 'development_area',
};
