// GET /api/events — Get recent events
// POST /api/events — Emit a custom event

import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-bus';
import { db } from '@/lib/db';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const entityType = searchParams.get('entityType');
    const eventType = searchParams.get('eventType');
    // FIX C2: Accept workspaceId to scope events to a workspace
    const workspaceId = searchParams.get('workspaceId');

    // Build workspace filter: workspace events + global events (workspaceId = null)
    const workspaceFilter = workspaceId
      ? { OR: [{ workspaceId }, { workspaceId: null }] }
      : undefined;

    if (entityType) {
      const entityId = searchParams.get('entityId') ?? undefined;
      const events = await eventBus.getEventsByEntity(entityType, entityId, limit, workspaceId ?? undefined);
      return NextResponse.json({ events });
    }

    if (eventType) {
      const events = await db.eventLog.findMany({
        where: { eventType, ...(workspaceFilter ? { ...workspaceFilter } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
      return NextResponse.json({ events });
    }

    const events = await eventBus.getRecentEvents(limit, offset, workspaceId ?? undefined);
    return NextResponse.json({ events });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /events error:');
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, entityType, entityId, payload, workspaceId } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const event = await db.eventLog.create({
      data: {
        eventType,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        workspaceId: workspaceId ?? null,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /events error:');
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
