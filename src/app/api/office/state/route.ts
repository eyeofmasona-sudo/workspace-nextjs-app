// GET /api/office/state — Aggregated office state for the Agent Office UI

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // Verify workspace exists
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Fetch agents with profiles and runtime states
    const agents = await db.agent.findMany({
      where: { workspaceId },
      include: {
        profile: true,
        runtimeState: true,
        capabilities: { where: { enabled: true } },
        permissions: { where: { enabled: true } },
        modelConfigs: { where: { enabled: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch recent tasks (last 100)
    const tasks = await db.task.findMany({
      where: {
        epic: { project: { workspaceId } },
      },
      include: {
        assignedAgent: { select: { id: true, name: true, role: true } },
        approvalRequests: { where: { status: 'pending' } },
        _count: { select: { subtasks: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch pending approvals
    const approvals = await db.approvalRequest.findMany({
      where: {
        status: 'pending',
        agent: { workspaceId },
      },
      include: {
        agent: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch recent tool executions
    const toolExecutions = await db.toolExecution.findMany({
      where: { workspaceId },
      include: { tool: { select: { id: true, name: true, key: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Fetch recent events
    const recentEvents = await db.eventLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Build situation summary
    const activeTasks = tasks.filter((t) =>
      ['in_progress', 'planned', 'review', 'waiting_approval'].includes(t.status)
    ).length;

    const blockedTasks = tasks.filter((t) => t.status === 'waiting_approval').length;
    const approvalsNeeded = approvals.length;
    const runningTools = toolExecutions.filter(
      (e) => e.status === 'running' || e.status === 'pending'
    ).length;
    const failedExecutions = toolExecutions.filter(
      (e) => e.status === 'failed' || e.status === 'blocked'
    ).length;

    return NextResponse.json({
      workspaceId,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        type: a.type,
        status: a.status,
        locationZone: a.locationZone,
        activeTaskId: a.activeTaskId,
        visualProfile: a.visualProfile ? JSON.parse(a.visualProfile) : null,
        professionalStyle: a.professionalStyle ? JSON.parse(a.professionalStyle) : null,
        workspaceId: a.workspaceId,
        profile: a.profile
          ? {
              ...a.profile,
              workingStyle: a.profile.workingStyle ? JSON.parse(a.profile.workingStyle) : null,
              strengths: a.profile.strengths ? JSON.parse(a.profile.strengths) : null,
              limitations: a.profile.limitations ? JSON.parse(a.profile.limitations) : null,
              responsibilities: a.profile.responsibilities ? JSON.parse(a.profile.responsibilities) : null,
            }
          : null,
        runtimeState: a.runtimeState
          ? {
              ...a.runtimeState,
              metadata: a.runtimeState.metadata ? JSON.parse(a.runtimeState.metadata) : null,
            }
          : null,
        capabilities: a.capabilities.map((c) => ({
          ...c,
          metadata: c.metadata ? JSON.parse(c.metadata) : null,
        })),
        permissions: a.permissions,
        modelConfigs: a.modelConfigs,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        riskLevel: t.riskLevel,
        requiresApproval: t.requiresApproval,
        assignedAgentId: t.assignedAgentId,
        assignedAgent: t.assignedAgent
          ? { id: t.assignedAgent.id, name: t.assignedAgent.name, role: t.assignedAgent.role }
          : null,
        epicId: t.epicId,
        parentTaskId: t.parentTaskId,
        costEstimate: t.costEstimate,
        costActual: t.costActual,
        subtaskCount: t._count.subtasks,
        pendingApprovals: t.approvalRequests.length,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      approvals: approvals.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        workspaceId: a.workspaceId,
        agentId: a.agentId,
        agent: a.agent,
        actionType: a.actionType,
        summary: a.summary,
        risk: a.risk,
        payload: a.payload ? JSON.parse(a.payload) : null,
        status: a.status,
        createdAt: a.createdAt,
      })),
      toolExecutions: toolExecutions.map((e) => ({
        id: e.id,
        workspaceId: e.workspaceId,
        agentId: e.agentId,
        taskId: e.taskId,
        toolId: e.toolId,
        action: e.action,
        correlationId: e.correlationId,
        inputSummary: e.inputSummary,
        outputSummary: e.outputSummary,
        status: e.status,
        riskLevel: e.riskLevel,
        approvalRequestId: e.approvalRequestId,
        errorMessage: e.errorMessage,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        tool: e.tool,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        createdAt: e.createdAt,
      })),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        entityType: e.entityType,
        entityId: e.entityId,
        payload: e.payload ? JSON.parse(e.payload) : null,
        createdAt: e.createdAt,
      })),
      situation: {
        activeTasks,
        blockedTasks,
        approvalsNeeded,
        runningTools,
        failedExecutions,
      },
    });
  } catch (error) {
    console.error('[API] GET /office/state error:', error);
    return NextResponse.json({ error: 'Failed to fetch office state' }, { status: 500 });
  }
}
