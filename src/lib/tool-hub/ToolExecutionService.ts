// ─── Agent OS — Tool Execution Service ───────────────────────
// Handles tool execution: logging, approval, status tracking.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { RiskLevel } from '../types/domain';

class ToolExecutionService {
  private static instance: ToolExecutionService | null = null;

  private constructor() {}

  static getInstance(): ToolExecutionService {
    if (!ToolExecutionService.instance) {
      ToolExecutionService.instance = new ToolExecutionService();
    }
    return ToolExecutionService.instance;
  }

  /**
   * Create a new ToolExecution record and emit event
   */
  async createExecution(params: {
    workspaceId: string;
    agentId?: string;
    taskId?: string;
    toolId: string;
    action: string;
    inputSummary?: string;
    riskLevel?: string;
    metadata?: Record<string, unknown>;
  }) {
    const execution = await db.toolExecution.create({
      data: {
        workspaceId: params.workspaceId,
        agentId: params.agentId ?? null,
        taskId: params.taskId ?? null,
        toolId: params.toolId,
        action: params.action,
        inputSummary: params.inputSummary ?? null,
        status: 'pending',
        riskLevel: params.riskLevel ?? 'low',
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });

    await eventBus.emit(EventTypes.TOOL_EXECUTION_REQUESTED, {
      executionId: execution.id,
      toolId: params.toolId,
      toolKey: '', // Will be filled by caller
      agentId: params.agentId,
      action: params.action,
      workspaceId: params.workspaceId,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Update execution status to running
   */
  async markRunning(executionId: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: { status: 'running' },
    });

    await eventBus.emit(EventTypes.TOOL_EXECUTION_STARTED, {
      executionId,
      toolId: execution.toolId,
      toolKey: '', // Caller should augment
      agentId: execution.agentId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as successful with output summary
   */
  async markSuccess(executionId: string, outputSummary?: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'success',
        outputSummary: outputSummary ?? null,
        completedAt: new Date(),
      },
    });

    await eventBus.emit(EventTypes.TOOL_EXECUTION_SUCCEEDED, {
      executionId,
      toolId: execution.toolId,
      toolKey: '',
      agentId: execution.agentId ?? undefined,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as failed with error message
   */
  async markFailed(executionId: string, errorMessage: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });

    await eventBus.emit(EventTypes.TOOL_EXECUTION_FAILED, {
      executionId,
      toolId: execution.toolId,
      toolKey: '',
      agentId: execution.agentId ?? undefined,
      error: errorMessage,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as blocked (insufficient permissions)
   */
  async markBlocked(executionId: string, reason: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'blocked',
        errorMessage: reason,
        completedAt: new Date(),
      },
    });

    await eventBus.emit(EventTypes.TOOL_EXECUTION_BLOCKED, {
      executionId,
      toolId: execution.toolId,
      toolKey: '',
      agentId: execution.agentId ?? undefined,
      reason,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Mark execution as requires_approval and link approval request
   */
  async markRequiresApproval(executionId: string, approvalRequestId: string) {
    const execution = await db.toolExecution.update({
      where: { id: executionId },
      data: {
        status: 'requires_approval',
        approvalRequestId,
        completedAt: new Date(),
      },
    });

    await eventBus.emit(EventTypes.TOOL_APPROVAL_REQUIRED, {
      executionId,
      toolId: execution.toolId,
      toolKey: '',
      agentId: execution.agentId ?? undefined,
      approvalRequestId,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return execution;
  }

  /**
   * Get a single execution by ID
   */
  async getExecution(executionId: string) {
    return db.toolExecution.findUnique({
      where: { id: executionId },
      include: { tool: true },
    });
  }

  /**
   * Get executions with filters
   */
  async getExecutions(params: {
    workspaceId: string;
    agentId?: string;
    toolId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {
      workspaceId: params.workspaceId,
    };
    if (params.agentId) where.agentId = params.agentId;
    if (params.toolId) where.toolId = params.toolId;
    if (params.status) where.status = params.status;

    return db.toolExecution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { tool: true },
    });
  }

  /**
   * Create an approval request for a tool execution
   */
  async createToolApproval(params: {
    workspaceId: string;
    agentId: string;
    taskId?: string;
    toolId: string;
    toolKey: string;
    action: string;
    risk: RiskLevel;
    inputSummary?: string;
  }) {
    // We need a taskId for ApprovalRequest — create a placeholder or use the provided one
    // If no taskId, we create a synthetic task for this approval
    let taskId = params.taskId;

    if (!taskId) {
      // Find or create a placeholder epic/project for tool approvals
      const workspace = await db.workspace.findUnique({
        where: { id: params.workspaceId },
        include: { projects: { take: 1 } },
      });

      let projectId: string;
      if (workspace?.projects[0]) {
        projectId = workspace.projects[0].id;
      } else {
        const project = await db.project.create({
          data: {
            workspaceId: params.workspaceId,
            name: 'Tool Approvals',
            description: 'Auto-created project for tool approval requests',
          },
        });
        projectId = project.id;
      }

      const epic = await db.epic.create({
        data: {
          projectId,
          title: 'Tool Approval Requests',
          status: 'in_progress',
        },
      });

      const task = await db.task.create({
        data: {
          epicId: epic.id,
          title: `Tool approval: ${params.toolKey} ${params.action}`,
          status: 'waiting_approval',
          riskLevel: params.risk,
          requiresApproval: true,
        },
      });
      taskId = task.id;
    }

    const approvalRequest = await db.approvalRequest.create({
      data: {
        taskId,
        agentId: params.agentId,
        actionType: 'execute',
        summary: `Tool execution approval: ${params.toolKey} (${params.action}) by agent ${params.agentId}`,
        risk: params.risk,
        payload: JSON.stringify({
          toolId: params.toolId,
          toolKey: params.toolKey,
          action: params.action,
          inputSummary: params.inputSummary,
        }),
        status: 'pending',
      },
    });

    await eventBus.emit(EventTypes.APPROVAL_REQUESTED, {
      approvalId: approvalRequest.id,
      taskId,
      agentId: params.agentId,
      actionType: 'execute',
      risk: params.risk,
      timestamp: Date.now(),
      source: 'tool-execution-service',
    });

    return approvalRequest;
  }
}

export const toolExecutionService = ToolExecutionService.getInstance();
