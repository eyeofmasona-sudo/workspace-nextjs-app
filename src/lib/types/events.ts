// ─── Agent OS — Event System Types ───────────────────────────

import type {
  TaskStatus,
  AgentStatus,
  OfficeZone,
  ApprovalStatus,
  MemoryScope,
  RiskLevel,
} from './domain';

// ─── Event Type Constants ────────────────────────────────────

export const EventTypes = {
  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_ARCHIVED: 'project.archived',

  // Epic events
  EPIC_CREATED: 'epic.created',
  EPIC_UPDATED: 'epic.updated',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STARTED: 'task.started',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  TASK_STATUS_CHANGED: 'task.status_changed',

  // Agent events
  AGENT_CREATED: 'agent.created',
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  AGENT_LOCATION_CHANGED: 'agent.location_changed',

  // Approval events
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_APPROVED: 'approval.approved',
  APPROVAL_REJECTED: 'approval.rejected',

  // Memory events
  MEMORY_CREATED: 'memory.created',

  // Cost events
  COST_LOGGED: 'cost.logged',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

// ─── Event Payloads ──────────────────────────────────────────

export interface BaseEventPayload {
  timestamp: number;
  source?: string; // module that emitted the event
}

export interface ProjectCreatedPayload extends BaseEventPayload {
  projectId: string;
  workspaceId: string;
  name: string;
}

export interface EpicCreatedPayload extends BaseEventPayload {
  epicId: string;
  projectId: string;
  title: string;
}

export interface TaskCreatedPayload extends BaseEventPayload {
  taskId: string;
  epicId: string;
  title: string;
}

export interface TaskAssignedPayload extends BaseEventPayload {
  taskId: string;
  agentId: string;
  agentName: string;
}

export interface TaskStartedPayload extends BaseEventPayload {
  taskId: string;
  agentId: string;
}

export interface TaskCompletedPayload extends BaseEventPayload {
  taskId: string;
  agentId: string;
  costActual?: number;
}

export interface TaskFailedPayload extends BaseEventPayload {
  taskId: string;
  agentId: string;
  error?: string;
}

export interface TaskStatusChangedPayload extends BaseEventPayload {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}

export interface AgentCreatedPayload extends BaseEventPayload {
  agentId: string;
  workspaceId: string;
  name: string;
  role: string;
}

export interface AgentStatusChangedPayload extends BaseEventPayload {
  agentId: string;
  fromStatus: AgentStatus;
  toStatus: AgentStatus;
}

export interface AgentLocationChangedPayload extends BaseEventPayload {
  agentId: string;
  fromZone: OfficeZone;
  toZone: OfficeZone;
}

export interface ApprovalRequestedPayload extends BaseEventPayload {
  approvalId: string;
  taskId: string;
  agentId: string;
  actionType: string;
  risk: RiskLevel;
}

export interface ApprovalApprovedPayload extends BaseEventPayload {
  approvalId: string;
  taskId: string;
}

export interface ApprovalRejectedPayload extends BaseEventPayload {
  approvalId: string;
  taskId: string;
}

export interface MemoryCreatedPayload extends BaseEventPayload {
  memoryId: string;
  scope: MemoryScope;
  type: string;
}

export interface CostLoggedPayload extends BaseEventPayload {
  costLogId: string;
  agentId: string;
  taskId?: string;
  provider?: string;
  model?: string;
  cost: number;
}

// ─── Event Map (for type-safe subscriptions) ─────────────────

export interface EventMap {
  [EventTypes.PROJECT_CREATED]: ProjectCreatedPayload;
  [EventTypes.PROJECT_UPDATED]: BaseEventPayload & { projectId: string };
  [EventTypes.PROJECT_ARCHIVED]: BaseEventPayload & { projectId: string };
  [EventTypes.EPIC_CREATED]: EpicCreatedPayload;
  [EventTypes.EPIC_UPDATED]: BaseEventPayload & { epicId: string };
  [EventTypes.TASK_CREATED]: TaskCreatedPayload;
  [EventTypes.TASK_ASSIGNED]: TaskAssignedPayload;
  [EventTypes.TASK_STARTED]: TaskStartedPayload;
  [EventTypes.TASK_COMPLETED]: TaskCompletedPayload;
  [EventTypes.TASK_FAILED]: TaskFailedPayload;
  [EventTypes.TASK_STATUS_CHANGED]: TaskStatusChangedPayload;
  [EventTypes.AGENT_CREATED]: AgentCreatedPayload;
  [EventTypes.AGENT_STATUS_CHANGED]: AgentStatusChangedPayload;
  [EventTypes.AGENT_LOCATION_CHANGED]: AgentLocationChangedPayload;
  [EventTypes.APPROVAL_REQUESTED]: ApprovalRequestedPayload;
  [EventTypes.APPROVAL_APPROVED]: ApprovalApprovedPayload;
  [EventTypes.APPROVAL_REJECTED]: ApprovalRejectedPayload;
  [EventTypes.MEMORY_CREATED]: MemoryCreatedPayload;
  [EventTypes.COST_LOGGED]: CostLoggedPayload;
}

// ─── Event Handler Types ─────────────────────────────────────

export type EventHandler<T extends EventType = EventType> = (
  payload: EventMap[T]
) => void | Promise<void>;

export interface AgentOSEvent {
  type: EventType;
  payload: EventMap[EventType];
}
