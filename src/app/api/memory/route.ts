// GET /api/memory — List/search memory items
// POST /api/memory — Store a new memory item

import { NextRequest, NextResponse } from 'next/server';
import { memorySystem } from '@/lib/memory';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as 'global' | 'workspace' | 'project' | 'agent' | 'task' | null;
    const scopeId = searchParams.get('scopeId');
    const type = searchParams.get('type') as 'context' | 'decision' | 'fact' | 'lesson' | 'conversation_summary' | 'error' | null;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    if (query) {
      const items = await memorySystem.search(query, scope ?? undefined, scopeId ?? undefined, limit);
      return NextResponse.json({ items });
    }

    if (scope && type) {
      const items = await memorySystem.getByType(scope, type, scopeId ?? undefined, limit);
      return NextResponse.json({ items });
    }

    if (scope) {
      const items = await memorySystem.getByScope(scope, scopeId ?? undefined, limit);
      return NextResponse.json({ items });
    }

    const items = await memorySystem.getRecent(limit);
    return NextResponse.json({ items });
  } catch (error) {
    loggers.memory.error({ err: error }, '[API] GET /memory error:');
    return NextResponse.json({ error: 'Failed to fetch memory items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scope, scopeId, type, content, metadata } = body;

    if (!scope || !type || !content) {
      return NextResponse.json(
        { error: 'scope, type, and content are required' },
        { status: 400 }
      );
    }

    const item = await memorySystem.store({ scope, scopeId, type, content, metadata });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    loggers.memory.error({ err: error }, '[API] POST /memory error:');
    return NextResponse.json({ error: 'Failed to store memory' }, { status: 500 });
  }
}
