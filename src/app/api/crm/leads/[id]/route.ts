// GET   /api/crm/leads/[id] — full lead detail
// PATCH /api/crm/leads/[id] — update lead fields

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      contacts: true,
      conversations: {
        include: { messages: { orderBy: { timestamp: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
      },
      deals: { orderBy: { createdAt: 'desc' } },
      followUps: { orderBy: { date: 'asc' } },
    },
  });
  if (!lead) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}

const patchSchema = z.object({
  name:            z.string().min(1).optional(),
  company:         z.string().optional(),
  status:          z.enum(['new','contacted','qualified','proposal','won','lost','archived']).optional(),
  source:          z.string().optional(),
  phone:           z.string().optional(),
  email:           z.string().optional(),
  telegramHandle:  z.string().optional(),
  notes:           z.string().optional(),
  tags:            z.array(z.string()).optional(),
  score:           z.number().int().min(0).max(100).optional(),
  assignedAgentId: z.string().nullable().optional(),
  nextFollowUpAt:  z.string().datetime().nullable().optional(),
  metadata:        z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { tags, metadata, nextFollowUpAt, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (tags !== undefined)        data.tags = JSON.stringify(tags);
  if (metadata !== undefined)    data.metadata = JSON.stringify(metadata);
  if (nextFollowUpAt !== undefined) data.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;

  const lead = await db.lead.update({ where: { id }, data });
  return NextResponse.json({ ok: true, lead });
}
