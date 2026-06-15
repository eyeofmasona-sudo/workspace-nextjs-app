// POST /api/crm/leads/[id]/followups — create a follow-up task

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({
  date:      z.string().datetime(),
  note:      z.string().optional(),
  agentId:   z.string().optional(),
  agentName: z.string().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ ok: false, error: 'Lead not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { date, note, agentId, agentName } = parsed.data;

  const followUp = await db.followUp.create({
    data: {
      leadId:    id,
      agentId:   agentId ?? null,
      agentName: agentName ?? null,
      date:      new Date(date),
      note:      note ?? null,
    },
  });

  // Update lead.nextFollowUpAt if this is sooner
  const newDate = new Date(date);
  if (!lead.nextFollowUpAt || newDate < new Date(lead.nextFollowUpAt)) {
    await db.lead.update({ where: { id }, data: { nextFollowUpAt: newDate } });
  }

  return NextResponse.json({ ok: true, followUp }, { status: 201 });
}
