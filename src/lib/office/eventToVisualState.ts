// ─── Agent OS — Event → Visual State Mapping ────────────────
// Maps system events to visual state changes for the Office UI.
// Used by the frontend to react to events and update agent visuals.

import type { AgentStatus, OfficeZone } from '@/lib/types/domain';

export interface VisualStateChange {
  agentId?: string;
  newStatus?: AgentStatus;
  newZone?: OfficeZone;
  newActivity?: string;
  highlight?: boolean;
  notification?: string;
}

// Map events to visual state changes
export function eventToVisualState(eventType: string, payload: Record<string, unknown>): VisualStateChange | null {
  switch (eventType) {
    case 'task.assigned':
      return {
        agentId: payload.agentId as string,
        newStatus: 'working',
        highlight: true,
        notification: `Task assigned`,
      };

    case 'agent.status_changed':
      return {
        agentId: payload.agentId as string,
        newStatus: payload.toStatus as AgentStatus,
      };

    case 'agent.location_changed':
      return {
        agentId: payload.agentId as string,
        newZone: payload.toZone as OfficeZone,
      };

    case 'tool.execution_started':
      return {
        agentId: payload.agentId as string,
        newStatus: 'working',
        newActivity: `Using ${payload.toolKey ?? 'tool'}`,
      };

    case 'tool.execution_succeeded':
      return {
        agentId: payload.agentId as string,
        newStatus: 'reviewing',
        highlight: true,
        notification: `Tool ${payload.toolKey ?? ''} succeeded`,
      };

    case 'tool.execution_failed':
      return {
        agentId: payload.agentId as string,
        newStatus: 'error',
        highlight: true,
        notification: `Tool ${payload.toolKey ?? ''} failed`,
      };

    case 'tool.approval_required':
      return {
        agentId: payload.agentId as string,
        newStatus: 'waiting_approval',
        highlight: true,
        notification: `Approval needed for ${payload.toolKey ?? 'tool'}`,
      };

    case 'tool.execution_blocked':
      return {
        agentId: payload.agentId as string,
        newStatus: 'error',
        highlight: true,
        notification: `Tool blocked: insufficient permissions`,
      };

    case 'approval.requested':
      return {
        agentId: payload.agentId as string,
        newStatus: 'waiting_approval',
        highlight: true,
      };

    case 'approval.approved':
      return {
        agentId: payload.agentId as string,
        newStatus: 'working',
        highlight: true,
        notification: 'Approval granted',
      };

    case 'approval.rejected':
      return {
        agentId: payload.agentId as string,
        newStatus: 'idle',
        highlight: true,
        notification: 'Approval rejected',
      };

    case 'task.completed':
      return {
        agentId: payload.agentId as string,
        newStatus: 'done',
        highlight: true,
        notification: 'Task completed',
      };

    case 'task.failed':
      return {
        agentId: payload.agentId as string,
        newStatus: 'error',
        highlight: true,
        notification: 'Task failed',
      };

    case 'orchestrator.message_received':
      return {
        agentId: undefined,
        newZone: 'command_area',
        highlight: true,
      };

    default:
      return null;
  }
}
