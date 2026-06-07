// GET /api/projects — List all projects
// POST /api/projects — Create a new project

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eventBus } from '@/lib/event-bus';
import { EventTypes } from '@/lib/types/events';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');

    const projects = await db.project.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        epics: {
          include: {
            _count: { select: { tasks: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[API] GET /projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, name, description, sourceType, sourcePath, repoUrl } = body;

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'workspaceId and name are required' },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        workspaceId,
        name,
        description: description ?? null,
        sourceType: sourceType ?? 'local',
        sourcePath: sourcePath ?? null,
        repoUrl: repoUrl ?? null,
      },
    });

    await eventBus.emit(EventTypes.PROJECT_CREATED, {
      projectId: project.id,
      workspaceId,
      name,
      timestamp: Date.now(),
      source: 'api',
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /projects error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
