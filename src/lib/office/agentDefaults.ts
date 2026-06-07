// ─── Agent OS — Agent Visual Defaults ───────────────────────
// Maps agent roles to visual properties for the Office UI.

export interface AgentVisualDefaults {
  role: string;
  emoji: string;
  color: string;        // Hex color
  bgColor: string;      // Tailwind bg
  textColor: string;    // Tailwind text
  initials: string;     // 2-letter initials
}

export const AGENT_VISUAL_DEFAULTS: Record<string, AgentVisualDefaults> = {
  orchestrator: {
    role: 'orchestrator',
    emoji: '👑',
    color: '#8B5CF6',
    bgColor: 'bg-violet-500',
    textColor: 'text-violet-700',
    initials: 'OR',
  },
  analyst: {
    role: 'analyst',
    emoji: '🔍',
    color: '#3B82F6',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    initials: 'PA',
  },
  architect: {
    role: 'architect',
    emoji: '🏗️',
    color: '#F59E0B',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-700',
    initials: 'SA',
  },
  designer: {
    role: 'designer',
    emoji: '🎨',
    color: '#EC4899',
    bgColor: 'bg-pink-500',
    textColor: 'text-pink-700',
    initials: 'UD',
  },
  frontend_engineer: {
    role: 'frontend_engineer',
    emoji: '💻',
    color: '#10B981',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    initials: 'FE',
  },
  backend_engineer: {
    role: 'backend_engineer',
    emoji: '⚙️',
    color: '#6366F1',
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-700',
    initials: 'BE',
  },
  data_engineer: {
    role: 'data_engineer',
    emoji: '🗃️',
    color: '#14B8A6',
    bgColor: 'bg-teal-500',
    textColor: 'text-teal-700',
    initials: 'DE',
  },
  qa_engineer: {
    role: 'qa_engineer',
    emoji: '🛡️',
    color: '#F43F5E',
    bgColor: 'bg-rose-500',
    textColor: 'text-rose-700',
    initials: 'QA',
  },
  devops_engineer: {
    role: 'devops_engineer',
    emoji: '🚀',
    color: '#F97316',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-700',
    initials: 'DO',
  },
  researcher: {
    role: 'researcher',
    emoji: '📚',
    color: '#8B5CF6',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-700',
    initials: 'RS',
  },
};

export function getAgentVisual(role: string): AgentVisualDefaults {
  return AGENT_VISUAL_DEFAULTS[role] ?? {
    role,
    emoji: '🤖',
    color: '#6B7280',
    bgColor: 'bg-gray-500',
    textColor: 'text-gray-700',
    initials: role.slice(0, 2).toUpperCase(),
  };
}
