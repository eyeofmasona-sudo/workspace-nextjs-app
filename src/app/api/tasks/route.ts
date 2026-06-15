// GET /api/tasks — List tasks
// POST /api/tasks — Create a new task

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eventBus } from '@/lib/event-bus';
import { EventTypes } from '@/lib/types/events';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const epicId = searchParams.get('epicId');
    const status = searchParams.get('status');
    const assignedAgentId = searchParams.get('assignedAgentId');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const tasks = await db.task.findMany({
      where: {
        ...(epicId ? { epicId } : {}),
        ...(status ? { status } : {}),
        ...(assignedAgentId ? { assignedAgentId } : {}),
      },
      include: {
        assignedAgent: { select: { id: true, name: true, role: true } },
        subtasks: { select: { id: true, title: true, status: true } },
        _count: { select: { approvalRequests: true, costLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /tasks error:');
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      epicId,
      parentTaskId,
      title,
      description,
      priority,
      assignedAgentId,
      riskLevel,
      requiresApproval,
      costEstimate,
    } = body;

    if (!epicId || !title) {
      return NextResponse.json(
        { error: 'epicId and title are required' },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        epicId,
        parentTaskId: parentTaskId ?? null,
        title,
        description: description ?? null,
        priority: priority ?? 'medium',
        assignedAgentId: assignedAgentId ?? null,
        riskLevel: riskLevel ?? 'low',
        requiresApproval: requiresApproval ?? false,
        costEstimate: costEstimate ?? null,
      },
    });

    await eventBus.emit(EventTypes.TASK_CREATED, {
      taskId: task.id,
      epicId,
      title,
      timestamp: Date.now(),
      source: 'api',
    });

    // If agent is assigned, emit task.assigned event
    if (assignedAgentId) {
      const agent = await db.agent.findUnique({ where: { id: assignedAgentId } });
      if (agent) {
        await eventBus.emit(EventTypes.TASK_ASSIGNED, {
          taskId: task.id,
          agentId: assignedAgentId,
          agentName: agent.name,
          timestamp: Date.now(),
          source: 'api',
        });
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /tasks error:');
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
