// ─── Agent OS — Tool Hub ─────────────────────────────────────
// Central orchestrator for tool execution.
// Flow: Agent → ToolHub → Permission Check → Tool Adapter → ToolExecution Log → EventLog

import { db } from '../db';
import { agentPermissionService } from '../agent-system/AgentPermissionService';
import { agentModelConfigService } from '../agent-system/AgentModelConfigService';
import { toolRegistryService } from './ToolRegistryService';
import { toolPermissionService } from './ToolPermissionService';
import { toolExecutionService } from './ToolExecutionService';
import { toolAdapterRegistry } from './ToolAdapterRegistry';
import type { ExecuteToolRequest, ExecuteToolResult } from './types';

class ToolHub {
  private static instance: ToolHub | null = null;

  private constructor() {}

  static getInstance(): ToolHub {
    if (!ToolHub.instance) {
      ToolHub.instance = new ToolHub();
    }
    return ToolHub.instance;
  }

  /**
   * Execute a tool request with full permission and approval checks.
   *
   * Flow:
   * 1. Verify workspace exists
   * 2. Verify agent exists and belongs to workspace
   * 3. Verify tool exists and is enabled
   * 4. Resolve ToolPermissionPolicy
   * 5. Check AgentPermission
   * 6. If insufficient → block and log
   * 7. If requires approval or risk critical → create ApprovalRequest
   * 8. Otherwise execute adapter skeleton
   */
  async executeTool(request: ExecuteToolRequest): Promise<ExecuteToolResult> {
    const { workspaceId, agentId, taskId, toolKey, action, input } = request;

    // 1. Verify workspace exists
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return {
        status: 'failed',
        executionId: '',
        error: `Workspace not found: ${workspaceId}`,
      };
    }

    // 2. Verify agent exists and belongs to workspace
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return {
        status: 'failed',
        executionId: '',
        error: `Agent not found: ${agentId}`,
      };
    }
    if (agent.workspaceId !== workspaceId) {
      return {
        status: 'failed',
        executionId: '',
        error: `Agent ${agentId} does not belong to workspace ${workspaceId}`,
      };
    }

    // 3. Verify tool exists and is enabled
    const tool = await toolRegistryService.getToolByKey(toolKey, workspaceId);
    if (!tool) {
      return {
        status: 'failed',
        executionId: '',
        error: `Tool not found: ${toolKey}`,
      };
    }
    if (!tool.enabled) {
      return {
        status: 'failed',
        executionId: '',
        error: `Tool is disabled: ${toolKey}`,
      };
    }

    // Create ToolExecution record
    const execution = await toolExecutionService.createExecution({
      workspaceId,
      agentId,
      taskId,
      toolId: tool.id,
      action,
      inputSummary: JSON.stringify(input).slice(0, 500), // Truncate for safety
      riskLevel: tool.riskLevel,
      metadata: { toolKey },
    });

    // 4 & 5. Check permissions via ToolPermissionPolicy → AgentPermission
    const permissionCheck = await toolPermissionService.checkToolPermission(agentId, tool.id);
    if (!permissionCheck.allowed) {
      await toolExecutionService.markBlocked(execution.id, permissionCheck.reason ?? 'Insufficient permissions');
      return {
        status: 'blocked',
        executionId: execution.id,
        error: permissionCheck.reason ?? 'Insufficient permissions',
      };
    }

    // 6. Check if approval is required
    if (tool.requiresApproval || tool.riskLevel === 'critical') {
      // Create approval request
      const approvalRequest = await toolExecutionService.createToolApproval({
        workspaceId,
        agentId,
        taskId,
        toolId: tool.id,
        toolKey: tool.key,
        action,
        risk: tool.riskLevel as 'low' | 'medium' | 'high' | 'critical',
        inputSummary: JSON.stringify(input).slice(0, 500),
      });

      await toolExecutionService.markRequiresApproval(execution.id, approvalRequest.id);

      return {
        status: 'requires_approval',
        executionId: execution.id,
        approvalRequestId: approvalRequest.id,
      };
    }

    // 7. Execute adapter
    await toolExecutionService.markRunning(execution.id);

    try {
      // Special handling for model.resolve — uses AgentModelConfigService
      if (toolKey === 'model.resolve') {
        const resolvedModel = await agentModelConfigService.resolveModelForAgent(agentId);
        await toolExecutionService.markSuccess(
          execution.id,
          JSON.stringify(resolvedModel)
        );
        return {
          status: 'success',
          executionId: execution.id,
          output: resolvedModel,
        };
      }

      // Get adapter
      const adapter = toolAdapterRegistry.getAdapter(toolKey);
      if (!adapter) {
        await toolExecutionService.markFailed(execution.id, `No adapter found for tool: ${toolKey}`);
        return {
          status: 'failed',
          executionId: execution.id,
          error: `No adapter found for tool: ${toolKey}`,
        };
      }

      // Execute adapter
      const result = await adapter.execute({
        workspaceId,
        agentId,
        taskId,
        toolKey,
        action,
        input,
      });

      if (result.success) {
        await toolExecutionService.markSuccess(
          execution.id,
          JSON.stringify(result.data).slice(0, 500)
        );
        return {
          status: 'success',
          executionId: execution.id,
          output: result.data,
        };
      } else {
        await toolExecutionService.markFailed(execution.id, result.error ?? 'Adapter returned failure');
        return {
          status: 'failed',
          executionId: execution.id,
          error: result.error ?? 'Adapter returned failure',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await toolExecutionService.markFailed(execution.id, errorMessage);
      return {
        status: 'failed',
        executionId: execution.id,
        error: errorMessage,
      };
    }
  }
}

export const toolHub = ToolHub.getInstance();
