// GET  /api/crm/leads — list leads (filter status/agent/source)
// POST /api/crm/leads — create new lead

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') ?? undefined;
  const status      = searchParams.get('status') ?? undefined;
  const agentId     = searchParams.get('agentId') ?? undefined;
  const source      = searchParams.get('source') ?? undefined;
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const where: Record<string, unknown> = {};
  if (workspaceId) where.workspaceId = workspaceId;
  if (status)      where.status = status;
  if (agentId)     where.assignedAgentId = agentId;
  if (source)      where.source = source;

  const leads = await db.lead.findMany({
    where,
    include: {
      deals:    { orderBy: { createdAt: 'desc' }, take: 1 },
      followUps: { where: { done: false }, orderBy: { date: 'asc' }, take: 1 },
      _count:   { select: { conversations: true, followUps: true } },
    },
    orderBy: [{ score: 'desc' }, { lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({ ok: true, leads, count: leads.length });
}

const createSchema = z.object({
  workspaceId:     z.string(),
  name:            z.string().min(1).max(200),
  company:         z.string().optional(),
  source:          z.enum(['manual','telegram','email','website','instagram','whatsapp','referral']).optional().default('manual'),
  phone:           z.string().optional(),
  email:           z.string().email().optional().or(z.literal('')),
  telegramHandle:  z.string().optional(),
  notes:           z.string().optional(),
  tags:            z.array(z.string()).optional().default([]),
  score:           z.number().int().min(0).max(100).optional().default(0),
  assignedAgentId: z.string().optional(),
  metadata:        z.record(z.string(), z.unknown()).optional(),
  // Optional: auto-create a conversation
  platform:        z.string().optional(),
  firstMessage:    z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { tags, metadata, platform, firstMessage, email, ...rest } = parsed.data;

  const lead = await db.lead.create({
    data: {
      ...rest,
      email: email || null,
      tags:     JSON.stringify(tags),
      metadata: JSON.stringify(metadata ?? {}),
    },
  });

  // Auto-create conversation + first message if provided
  if (platform && firstMessage) {
    const conv = await db.conversation.create({
      data: { leadId: lead.id, platform, title: `${lead.name} via ${platform}` },
    });
    await db.conversationMessage.create({
      data: {
        conversationId: conv.id,
        content:   firstMessage,
        direction: 'in',
        timestamp: new Date(),
      },
    });
    await db.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date(), status: 'contacted' },
    });
  }

  const full = await db.lead.findUnique({
    where: { id: lead.id },
    include: { conversations: { include: { messages: { orderBy: { timestamp: 'asc' } } } }, followUps: true, deals: true },
  });

  return NextResponse.json({ ok: true, lead: full }, { status: 201 });
}
