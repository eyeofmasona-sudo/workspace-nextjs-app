// ─── Agent OS — Status Visual Mapping ────────────────────────
// Maps agent runtime statuses to visual states in the Office UI.

import type { AgentStatus } from '@/lib/types/domain';

export interface StatusVisual {
  label: string;
  color: string;         // Tailwind bg class
  textColor: string;     // Tailwind text class
  borderColor: string;   // Tailwind border class
  animation: string;     // CSS animation class
  emoji: string;
  description: string;
  isActive: boolean;     // Whether the agent is actively doing something
}

export const STATUS_VISUAL_MAP: Record<AgentStatus, StatusVisual> = {
  idle: {
    label: 'Idle',
    color: 'bg-slate-400',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-300',
    animation: '',
    emoji: '☕',
    description: 'Available for tasks',
    isActive: false,
  },
  thinking: {
    label: 'Thinking',
    color: 'bg-amber-400',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    animation: 'animate-pulse',
    emoji: '🤔',
    description: 'Processing information',
    isActive: true,
  },
  working: {
    label: 'Working',
    color: 'bg-emerald-400',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    animation: 'animate-pulse',
    emoji: '⚡',
    description: 'Actively working on a task',
    isActive: true,
  },
  waiting_api: {
    label: 'Waiting API',
    color: 'bg-sky-400',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-300',
    animation: 'animate-pulse',
    emoji: '📡',
    description: 'Waiting for external API response',
    isActive: true,
  },
  reviewing: {
    label: 'Reviewing',
    color: 'bg-violet-400',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-300',
    animation: 'animate-pulse',
    emoji: '🔍',
    description: 'Reviewing work or code',
    isActive: true,
  },
  waiting_approval: {
    label: 'Waiting Approval',
    color: 'bg-orange-400',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    animation: 'animate-pulse',
    emoji: '⚠️',
    description: 'Needs approval to proceed',
    isActive: true,
  },
  done: {
    label: 'Done',
    color: 'bg-green-400',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    animation: '',
    emoji: '✅',
    description: 'Task completed',
    isActive: false,
  },
  error: {
    label: 'Error',
    color: 'bg-red-400',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    animation: 'animate-pulse',
    emoji: '❌',
    description: 'Encountered an error',
    isActive: true,
  },
  offline: {
    label: 'Offline',
    color: 'bg-gray-300',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    animation: '',
    emoji: '💤',
    description: 'Not available',
    isActive: false,
  },
};

export function getStatusVisual(status: string): StatusVisual {
  return STATUS_VISUAL_MAP[status as AgentStatus] ?? STATUS_VISUAL_MAP.offline;
}
