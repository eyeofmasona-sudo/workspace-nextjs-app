// ─── Agent OS — Animation Mapping ───────────────────────────
// Maps system events to visual animation triggers in the Office UI.

export interface AnimationTrigger {
  animationType: 'pulse' | 'glow' | 'shake' | 'bounce' | 'slide' | 'fade';
  targetZone?: string;   // Zone to highlight
  targetAgent?: string;  // Agent to animate
  duration: number;      // Duration in ms
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Map event type prefixes to animation triggers
export const EVENT_ANIMATION_MAP: Record<string, AnimationTrigger> = {
  'task.assigned': {
    animationType: 'bounce',
    duration: 1000,
    priority: 'medium',
  },
  'task.started': {
    animationType: 'pulse',
    duration: 800,
    priority: 'medium',
  },
  'task.completed': {
    animationType: 'glow',
    duration: 1200,
    priority: 'low',
  },
  'task.failed': {
    animationType: 'shake',
    duration: 600,
    priority: 'high',
  },
  'agent.status_changed': {
    animationType: 'pulse',
    duration: 600,
    priority: 'medium',
  },
  'agent.location_changed': {
    animationType: 'slide',
    duration: 800,
    priority: 'medium',
  },
  'tool.execution_started': {
    animationType: 'pulse',
    duration: 500,
    priority: 'low',
  },
  'tool.execution_succeeded': {
    animationType: 'glow',
    duration: 800,
    priority: 'low',
  },
  'tool.execution_failed': {
    animationType: 'shake',
    duration: 600,
    priority: 'high',
  },
  'tool.approval_required': {
    animationType: 'bounce',
    duration: 1000,
    priority: 'high',
  },
  'approval.requested': {
    animationType: 'bounce',
    duration: 1000,
    priority: 'high',
  },
  'approval.approved': {
    animationType: 'glow',
    duration: 800,
    priority: 'medium',
  },
  'approval.rejected': {
    animationType: 'shake',
    duration: 600,
    priority: 'high',
  },
  'orchestrator.message_received': {
    animationType: 'pulse',
    targetZone: 'command_area',
    duration: 500,
    priority: 'low',
  },
  'orchestrator.plan_created': {
    animationType: 'glow',
    targetZone: 'command_area',
    duration: 1000,
    priority: 'medium',
  },
  'orchestrator.plan_approved': {
    animationType: 'bounce',
    targetZone: 'command_area',
    duration: 800,
    priority: 'medium',
  },
};

export function getAnimationForEvent(eventType: string): AnimationTrigger | null {
  // Try direct match first
  if (EVENT_ANIMATION_MAP[eventType]) {
    return EVENT_ANIMATION_MAP[eventType];
  }
  // Try prefix match (e.g. "tool.execution_requested" matches "tool.")
  const prefix = eventType.split('.').slice(0, 1).join('.') + '.';
  for (const [key, value] of Object.entries(EVENT_ANIMATION_MAP)) {
    if (key.startsWith(prefix)) {
      return value;
    }
  }
  return null;
}
