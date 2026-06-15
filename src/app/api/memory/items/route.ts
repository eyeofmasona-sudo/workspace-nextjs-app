// POST /api/memory/items — Store via SharedMemoryService (with dedup + conflict detection)
// GET  /api/memory/items — List/search with full filter support

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sharedMemoryService } from '@/lib/memory/SharedMemoryService';

const itemSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  type: z.string(),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  visibility: z.enum(['global', 'workspace', 'agent_private']).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await sharedMemoryService.remember(parsed.data as Parameters<typeof sharedMemoryService.remember>[0]);
    return NextResponse.json({ ok: true, ...result }, { status: result.updated ? 200 : 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('secret')) return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query     = searchParams.get('q') ?? '';
  const wsId      = searchParams.get('workspaceId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const agentId   = searchParams.get('agentId') ?? undefined;
  const types     = searchParams.get('types')?.split(',') ?? undefined;
  const importance = searchParams.get('importance')?.split(',') ?? undefined;
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100);

  try {
    const items = await sharedMemoryService.recall(query, {
      workspaceId: wsId,
      projectId,
      agentId,
      types: types as import('@/lib/types/domain').MemoryType[] | undefined,
      importance: importance as import('@/lib/types/domain').MemoryImportance[] | undefined,
      limit,
    });
    return NextResponse.json({ ok: true, items, count: items.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
