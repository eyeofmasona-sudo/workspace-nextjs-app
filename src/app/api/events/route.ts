// GET /api/events — Get recent events
// POST /api/events — Emit a custom event

import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-bus';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const entityType = searchParams.get('entityType');
    const eventType = searchParams.get('eventType');

    if (entityType) {
      const entityId = searchParams.get('entityId') ?? undefined;
      const events = await eventBus.getEventsByEntity(entityType, entityId, limit);
      return NextResponse.json({ events });
    }

    if (eventType) {
      const events = await db.eventLog.findMany({
        where: { eventType },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
      return NextResponse.json({ events });
    }

    const events = await eventBus.getRecentEvents(limit, offset);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('[API] GET /events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, entityType, entityId, payload } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const event = await db.eventLog.create({
      data: {
        eventType,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /events error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
