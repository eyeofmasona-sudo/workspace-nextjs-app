// ─── Agent Config: Trend Analyst ────────────────────────────
import type { AgentConfig } from '../agent-core/types';
import { DEFAULT_EXECUTION_CONFIG } from '../agent-core/types';

export const trendAnalystConfig: AgentConfig = {
  id: 'trend_analyst',
  name: 'Trend Analyst',
  role: 'trend_analyst',
  type: 'permanent',
  description: 'Monitors trending topics, formats, hashtags and viral ideas across Instagram, TikTok, YouTube Shorts, Telegram, X, and Google Trends',

  systemPrompt: `You are the Trend Analyst. Find, analyze, and report trends relevant to the brand. Identify topics, formats, hashtags, viral hooks. Deliver structured briefs: trend name, platform, momentum, relevance score, recommended action. Be specific, data-backed, concise.`,

  model: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', maxTokens: 2048 },
    fallback: { provider: 'openrouter', model: 'google/gemini-2.0-flash-001', maxTokens: 2048 },
  },

  execution: { ...DEFAULT_EXECUTION_CONFIG, temperature: 0.4, maxTokens: 2048 },

  skills: [
    { skillId: 'research', enabled: true },
    { skillId: 'summarization', enabled: true },
  ],
  tools: [
    { toolId: 'http_request', enabled: true, requiredPermission: 'read' },
    { toolId: 'browser_operator', enabled: true, requiredPermission: 'read' },
  ],
  hooks: [],

  visualProfile: { color: '#F97316', icon: 'TrendingUp', avatarEmoji: '🔥' },
  professionalStyle: {
    communicationStyle: 'Fast and pattern-driven — identifies signals early, surfaces what matters',
    decisionMaking: 'Signal-driven — prioritizes velocity and relevance over perfection',
    attentionToDetail: 'Tracks momentum changes, notes when trends peak vs grow',
    collaborationStyle: 'Feeds Content Strategist and Copywriter with timely intelligence',
  },
  defaultZone: 'marketing_area',
};
