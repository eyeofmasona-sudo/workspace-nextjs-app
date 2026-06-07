// ─── Agent OS — Event Bus ────────────────────────────────────
// Skeleton event-driven architecture for the system.
// Future: replace with WebSocket-based pub/sub for real-time UI updates.

import type { EventType, EventMap, EventHandler, BaseEventPayload } from '../types/events';
import { db } from '../db';

// ─── Event Bus Singleton ─────────────────────────────────────

type TypedHandler<T extends EventType> = (payload: EventMap[T]) => void | Promise<void>;

class EventBus {
  private handlers: Map<EventType, Set<TypedHandler<EventType>>> = new Map();
  private static instance: EventBus | null = null;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event type
   */
  on<T extends EventType>(eventType: T, handler: TypedHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlerSet = this.handlers.get(eventType)!;
    handlerSet.add(handler as TypedHandler<EventType>);

    // Return unsubscribe function
    return () => {
      handlerSet.delete(handler as TypedHandler<EventType>);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * Emit an event — notifies all subscribers and logs to DB
   */
  async emit<T extends EventType>(eventType: T, payload: EventMap[T]): Promise<void> {
    // Log to database
    try {
      await db.eventLog.create({
        data: {
          eventType,
          entityType: (payload as BaseEventPayload & { entityType?: string }).entityType ?? this.extractEntityType(eventType),
          entityId: (payload as BaseEventPayload & { entityId?: string }).entityId ?? null,
          payload: JSON.stringify(payload),
        },
      });
    } catch (error) {
      console.error('[EventBus] Failed to log event:', error);
    }

    // Notify subscribers
    const handlerSet = this.handlers.get(eventType);
    if (handlerSet) {
      for (const handler of handlerSet) {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`[EventBus] Handler error for ${eventType}:`, error);
        }
      }
    }
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAny(handler: (eventType: EventType, payload: EventMap[EventType]) => void | Promise<void>): () => void {
    // Store the wildcard handler for future use
    // In skeleton mode, we just track the subscription
    const unsubscribes: Array<() => void> = [];

    // Subscribe to all known event types
    const allEventTypes = Object.values({
      PROJECT_CREATED: 'project.created',
      PROJECT_UPDATED: 'project.updated',
      PROJECT_ARCHIVED: 'project.archived',
      EPIC_CREATED: 'epic.created',
      EPIC_UPDATED: 'epic.updated',
      TASK_CREATED: 'task.created',
      TASK_ASSIGNED: 'task.assigned',
      TASK_STARTED: 'task.started',
      TASK_COMPLETED: 'task.completed',
      TASK_FAILED: 'task.failed',
      TASK_STATUS_CHANGED: 'task.status_changed',
      AGENT_CREATED: 'agent.created',
      AGENT_STATUS_CHANGED: 'agent.status_changed',
      AGENT_LOCATION_CHANGED: 'agent.location_changed',
      APPROVAL_REQUESTED: 'approval.requested',
      APPROVAL_APPROVED: 'approval.approved',
      APPROVAL_REJECTED: 'approval.rejected',
      MEMORY_CREATED: 'memory.created',
      COST_LOGGED: 'cost.logged',
      ORCHESTRATOR_MESSAGE_RECEIVED: 'orchestrator.message_received',
      ORCHESTRATOR_PLAN_CREATED: 'orchestrator.plan_created',
      ORCHESTRATOR_PLAN_APPROVED: 'orchestrator.plan_approved',
      ORCHESTRATOR_COST_ESTIMATED: 'orchestrator.cost_estimated',
      AGENT_PROFILE_UPDATED: 'agent.profile_updated',
      AGENT_CAPABILITY_UPDATED: 'agent.capability_updated',
      AGENT_PERMISSION_UPDATED: 'agent.permission_updated',
      AGENT_MODEL_CONFIG_UPDATED: 'agent.model_config_updated',
      AGENT_TASK_ASSIGNED: 'agent.task_assigned',
      AGENT_TASK_CLEARED: 'agent.task_cleared',
      AGENT_TEMPORARY_PROPOSED: 'agent.temporary_proposed',
      AGENT_TEMPORARY_CREATED: 'agent.temporary_created',
      AGENT_DEACTIVATED: 'agent.deactivated',
      AGENT_MEMORY_LINKED: 'agent.memory_linked',
      AGENT_MEMORY_UNLINKED: 'agent.memory_unlinked',
      TOOL_CREATED: 'tool.created',
      TOOL_UPDATED: 'tool.updated',
      TOOL_POLICY_UPDATED: 'tool.policy_updated',
      TOOL_EXECUTION_REQUESTED: 'tool.execution_requested',
      TOOL_EXECUTION_STARTED: 'tool.execution_started',
      TOOL_EXECUTION_SUCCEEDED: 'tool.execution_succeeded',
      TOOL_EXECUTION_FAILED: 'tool.execution_failed',
      TOOL_EXECUTION_BLOCKED: 'tool.execution_blocked',
      TOOL_APPROVAL_REQUIRED: 'tool.approval_required',
    } satisfies Record<string, EventType>) as EventType[];

    for (const eventType of allEventTypes) {
      const unsub = this.on(eventType, (payload) => handler(eventType, payload));
      unsubscribes.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  }

  /**
   * Get recent events from the database
   */
  async getRecentEvents(limit = 50, offset = 0) {
    return db.eventLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get events by entity type
   */
  async getEventsByEntity(entityType: string, entityId?: string, limit = 50) {
    return db.eventLog.findMany({
      where: {
        entityType,
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Extract entity type from event type string
   * e.g. "task.created" → "task"
   */
  private extractEntityType(eventType: EventType): string {
    return eventType.split('.')[0];
  }
}

// Export singleton
export const eventBus = EventBus.getInstance();

// Convenience function for direct import
export function emitEvent<T extends EventType>(eventType: T, payload: EventMap[T]) {
  return eventBus.emit(eventType, payload);
}

export function onEvent<T extends EventType>(eventType: T, handler: TypedHandler<T>) {
  return eventBus.on(eventType, handler);
}
