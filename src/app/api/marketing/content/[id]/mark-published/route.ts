// POST /api/marketing/content/[id]/mark-published
// Publisher agent (or human) marks content as manually published

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({
  publishedBy: z.string().optional().default('manual'), // agentId or "manual"
  notes:       z.string().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const existing = await db.contentItem.findUnique({
    where: { id },
    include: { queueItems: true },
  });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  if (existing.status === 'published_manual') {
    return NextResponse.json({ ok: false, error: 'Already published' }, { status: 409 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }

  const { publishedBy, notes } = parsed.data;
  const now = new Date();

  // Update ContentItem
  const item = await db.contentItem.update({
    where: { id },
    data: {
      status:      'published_manual',
      publishedAt: now,
      notes:       notes ? (existing.notes ? `${existing.notes}\n${notes}` : notes) : existing.notes,
    },
  });

  // Update any queue items
  if (existing.queueItems.length > 0) {
    await db.publishingQueueItem.updateMany({
      where: { contentItemId: id, isPublished: false },
      data: { isPublished: true, publishedAt: now, publishedBy },
    });
  }

  return NextResponse.json({ ok: true, item, publishedAt: now });
}
