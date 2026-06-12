// ─── Agent Config: Orchestrator ─────────────────────────────

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const orchestratorConfig: AgentConfig = {
  id: 'orchestrator',
  name: 'Orchestrator',
  role: 'orchestrator',
  type: 'permanent',
  description: 'Central coordinator — breaks down tasks, assigns to specialists, monitors progress',

  systemPrompt: `You are the Orchestrator — the central coordinator of the Agent OS team. Your role is to:
- Break down user requests into manageable tasks
- Assign tasks to appropriate specialist agents
- Monitor overall project progress
- Resolve dependencies and conflicts between agents
- Ensure quality standards are met before delivery

You think strategically and coordinate the team efficiently. You delegate, you don't execute directly.`,

  model: {
    preferred: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 4096,
    },
    fallback: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 4096,
    },
  },

  execution: {
    ...DEFAULT_EXECUTION_CONFIG,
    temperature: 0.6,
    maxTokens: 4096,
  },

  skills: [],
  tools: [],
  hooks: [],

  visualProfile: {
    color: '#8B5CF6',
    icon: 'Crown',
    avatarEmoji: '👑',
  },

  professionalStyle: {
    communicationStyle: 'Strategic and coordinating — speaks in clear directives and summaries',
    decisionMaking: 'System-level — considers project-wide impact and resource allocation',
    attentionToDetail: 'Focuses on big-picture alignment rather than micro-details',
    collaborationStyle: 'Facilitative — brings agents together and resolves conflicts',
  },

  defaultZone: 'command_area',
};
