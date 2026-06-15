// PATCH /api/crm/followups/[id] — mark done or update note/date

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({
  done:  z.boolean().optional(),
  note:  z.string().optional(),
  date:  z.string().datetime().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }

  const { done, note, date } = parsed.data;
  const data: Record<string, unknown> = {};
  if (done !== undefined) { data.done = done; if (done) data.doneAt = new Date(); }
  if (note !== undefined) data.note = note;
  if (date !== undefined) data.date = new Date(date);

  const followUp = await db.followUp.update({ where: { id }, data });

  // If done, recalculate lead.nextFollowUpAt
  if (done) {
    const next = await db.followUp.findFirst({
      where: { leadId: followUp.leadId, done: false },
      orderBy: { date: 'asc' },
    });
    await db.lead.update({
      where: { id: followUp.leadId },
      data: { nextFollowUpAt: next?.date ?? null },
    });
  }

  return NextResponse.json({ ok: true, followUp });
}
