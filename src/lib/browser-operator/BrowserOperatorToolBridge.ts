/**
 * Browser Operator ↔ ToolExecution Bridge
 *
 * Synchronizes BrowserOperatorTask status with ToolExecution records
 * in the DB-backed Tool Hub. When a browser task changes status,
 * the corresponding ToolExecution is updated accordingly.
 *
 * Status mapping:
 *   BrowserOperator (queued/running)  → ToolExecution (running)
 *   BrowserOperator (completed)       → ToolExecution (success)
 *   BrowserOperator (failed)          → ToolExecution (failed)
 *   BrowserOperator (needs_human)     → ToolExecution (success with needs_human metadata)
 *   BrowserOperator (cancelled)       → ToolExecution (failed)
 *
 * Security: Does not log cookies, tokens, or passwords.
 */

import type { BrowserTask, BrowserQueueEvent } from './BrowserOperatorTypes';
import type { BrowserOperatorQueue } from './BrowserOperatorQueue';

// ── Lazy imports for DB services ──────────────────────────────
async function getToolExecutionService() {
  const mod = await import('@/lib/tool-hub/ToolExecutionService');
  return mod.toolExecutionService;
}

async function getEventBus() {
  const mod = await import('@/lib/event-bus');
  return mod.eventBus;
}

async function getEventTypes() {
  const mod = await import('@/lib/types/events');
  return mod.EventTypes;
}

// ── Bridge Class ──────────────────────────────────────────────
export class BrowserOperatorToolBridge {
  private queue: BrowserOperatorQueue | null = null;
  private unsubscribers: Array<() => void> = [];

  /** Attach to a queue and start listening for events */
  attach(queue: BrowserOperatorQueue): void {
    this.detach();
    this.queue = queue;

    const handler = (event: BrowserQueueEvent) => this.handleEvent(event);

    const eventTypes: Array<import('./BrowserOperatorTypes').BrowserQueueEventType> = [
      'task:completed',
      'task:failed',
      'task:needs_human',
      'task:cancelled',
    ];

    for (const eventType of eventTypes) {
      queue.on(eventType, handler);
    }

    this.unsubscribers.push(() => {
      for (const eventType of eventTypes) {
        queue.off(eventType, handler);
      }
    });
  }

  /** Detach from queue and stop listening */
  detach(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.queue = null;
  }

  /** Handle a queue event and sync to ToolExecution */
  private async handleEvent(event: BrowserQueueEvent): Promise<void> {
    if (!this.queue) return;

    const task = this.queue.get(event.taskId);
    if (!task) return;

    // Check if this task was originated from a ToolExecution
    const executionId = task.input.options?.executionId as string | undefined;
    if (!executionId) return; // Not linked to a ToolExecution

    try {
      const executionService = await getToolExecutionService();

      switch (event.type) {
        case 'task:completed':
          await executionService.markSuccess(
            executionId,
            JSON.stringify({
              taskId: task.id,
              status: 'completed',
              result: task.output.result?.slice(0, 500),
              screenshots: task.output.screenshots,
              finalUrl: task.output.finalUrl,
            }),
          );
          break;

        case 'task:failed':
          await executionService.markFailed(
            executionId,
            `Browser task failed: ${task.output.error ?? 'Unknown error'}`,
          );
          break;

        case 'task:needs_human':
          // needs_human is NOT a failure — mark as success with metadata
          // so the orchestrator knows to wait rather than treating it as broken
          await executionService.markSuccess(
            executionId,
            JSON.stringify({
              taskId: task.id,
              status: 'needs_human',
              needsHumanReason: task.output.needsHumanReason,
              message: `Browser task paused: ${task.output.needsHumanReason}. Resume via POST /api/browser-operator/tasks/${task.id}/resume`,
              supportsManualTakeover: true,
            }),
          );
          break;

        case 'task:cancelled':
          await executionService.markFailed(
            executionId,
            'Browser task was cancelled',
          );
          break;
      }

      // Emit browser_operator event
      try {
        const eventBus = await getEventBus();
        const EventTypes = await getEventTypes();

        await eventBus.emit(EventTypes.TOOL_EXECUTION_SUCCEEDED, {
          executionId,
          toolKey: 'browser_ai_provider',
          agentId: task.input.agentId,
          browserTaskId: task.id,
          browserTaskStatus: task.output.status,
          timestamp: Date.now(),
          source: 'browser-operator-tool-bridge',
        });
      } catch {
        // EventBus not available — not critical
      }
    } catch (err) {
      console.error('[BrowserOperatorToolBridge] Failed to sync status:', err);
    }
  }

  /**
   * Create a BrowserOperatorTask linked to a ToolExecution.
   * This is called by the Tool Hub adapter when browser_ai_provider is invoked.
   */
  async createLinkedTask(
    taskInput: import('./BrowserOperatorTypes').BrowserTaskInput,
    executionId: string,
  ): Promise<BrowserTask | null> {
    if (!this.queue) return null;

    // Embed executionId in options so the bridge can find it later
    const enrichedInput = {
      ...taskInput,
      options: {
        ...(taskInput.options ?? {}),
        executionId,
      },
    };

    return this.queue.enqueue(enrichedInput);
  }
}
