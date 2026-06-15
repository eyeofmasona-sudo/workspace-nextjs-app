// POST /api/crm/leads/[id]/messages — add message to lead conversation history

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({
  content:   z.string().min(1),
  direction: z.enum(['in', 'out']),
  agentId:   z.string().optional(),
  agentName: z.string().optional(),
  platform:  z.string().optional().default('manual'),
  metadata:  z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const lead = await db.lead.findUnique({ where: { id }, include: { conversations: { orderBy: { updatedAt: 'desc' }, take: 1 } } });
  if (!lead) return NextResponse.json({ ok: false, error: 'Lead not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { content, direction, agentId, agentName, platform, metadata } = parsed.data;

  // Reuse existing conversation or create new one
  let conv = lead.conversations[0];
  if (!conv) {
    conv = await db.conversation.create({
      data: { leadId: id, platform: platform ?? 'manual', title: `${lead.name} via ${platform}` },
    });
  }

  const message = await db.conversationMessage.create({
    data: {
      conversationId: conv.id,
      agentId:   agentId ?? null,
      agentName: agentName ?? null,
      content,
      direction,
      timestamp: new Date(),
      metadata:  metadata ? JSON.stringify(metadata) : null,
    },
  });

  // Update lead lastMessageAt and status
  const statusUpdate: Record<string, unknown> = { lastMessageAt: new Date() };
  if (lead.status === 'new' && direction === 'out') statusUpdate.status = 'contacted';

  await db.lead.update({ where: { id }, data: statusUpdate });
  await db.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true, message, conversationId: conv.id }, { status: 201 });
}
