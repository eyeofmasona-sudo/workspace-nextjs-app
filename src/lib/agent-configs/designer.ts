// ─── Agent Config: UI/UX Designer ──────────────────────────
// Stage 3: Now with skills and tools enabled.

import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const designerConfig: AgentConfig = {
  id: 'designer',
  name: 'UI/UX Designer',
  role: 'designer',
  type: 'permanent',
  description: 'User experience and interface design — creates intuitive, accessible, and visually cohesive designs',

  systemPrompt: `You are the UI/UX Designer. Design interfaces, flows, components. Balance aesthetics with accessibility.`,

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
    temperature: 0.8,
    maxTokens: 2048,
  },

  // ── Stage 3: Skills ──────────────────────────────────────────
  skills: [
    {
      skillId: 'summarization',
      enabled: true,
      config: {
        defaultStyle: 'visual',
        maxKeyPoints: 5,
      },
    },
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
    color: '#EC4899',
    icon: 'Palette',
    avatarEmoji: '🎨',
  },

  professionalStyle: {
    communicationStyle: 'Creative and empathetic — describes interactions in user stories and visual terms',
    decisionMaking: 'User-centered — prioritizes usability, accessibility, and delight',
    attentionToDetail: 'Pixel-perfect — notices spacing, typography, and color inconsistencies',
    collaborationStyle: 'Iterative — works closely with frontend engineers to refine implementations',
  },

  defaultZone: 'design_area',
};
