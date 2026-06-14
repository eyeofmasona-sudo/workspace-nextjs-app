// ─── Agent Config: Publisher ──────────────────────────────────
import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const publisherConfig: AgentConfig = {
  id: 'publisher',
  name: 'Publisher',
  role: 'publisher',
  type: 'permanent',
  description: 'Schedules and publishes content to Instagram, TikTok, Telegram, YouTube, and other channels per editorial calendar. Requires platform API integrations.',

  systemPrompt: `You are the Publisher. Manage the publication schedule and coordinate content deployment. Input: approved content packages (text, visual/video brief, channel, date/time, hashtags). Output: structured publication queue with status per piece. For each item output: channel, scheduled time, content text, visual reference, hashtag set, status (ready/pending_asset/published/failed). Note: actual posting to social platforms requires API integration (currently requires manual posting or connected scheduling tools like Buffer/Later/Postiz). Flag missing assets or missing approvals before scheduling. Always require Brand Guardian sign-off before publishing.`,

  model: {
    preferred: { provider: 'openrouter', model: 'google/gemini-2.0-flash-001', maxTokens: 1536 },
    fallback: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', maxTokens: 1536 },
  },

  execution: { ...DEFAULT_EXECUTION_CONFIG, temperature: 0.2, maxTokens: 1536 },

  skills: [
    { skillId: 'automation', enabled: true },
    { skillId: 'calendar_management', enabled: true },
  ],
  tools: [
    { toolId: 'http_request', enabled: true, requiredPermission: 'write' },
    { toolId: 'browser_operator', enabled: true, requiredPermission: 'write' },
  ],
  hooks: [],

  visualProfile: { color: '#10B981', icon: 'Send', avatarEmoji: '📤' },
  professionalStyle: {
    communicationStyle: 'Systematic and precise — status-driven, no missed slots',
    decisionMaking: 'Rule-bound — only publishes approved content, flags everything else',
    attentionToDetail: 'Double-checks timing, timezone, platform format, approval status',
    collaborationStyle: 'Final step — receives from Brand Guardian, outputs to channels',
  },
  defaultZone: 'growth_lab',
};
