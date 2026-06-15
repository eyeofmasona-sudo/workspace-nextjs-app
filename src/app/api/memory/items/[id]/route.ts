// PATCH /api/memory/items/[id] — update a memory item
// DELETE /api/memory/items/[id] — forget (delete) a memory item

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sharedMemoryService } from '@/lib/memory/SharedMemoryService';

const patchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  visibility: z.enum(['global', 'workspace', 'agent_private']).optional(),
  requestingAgentId: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }

  const { requestingAgentId, ...patch } = parsed.data;

  try {
    const item = await sharedMemoryService.update(id, patch, requestingAgentId);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requestingAgentId = searchParams.get('agentId') ?? undefined;

  try {
    await sharedMemoryService.forget(id, requestingAgentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
