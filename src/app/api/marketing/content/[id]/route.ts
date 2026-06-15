// GET   /api/marketing/content/[id] — get single content item
// PATCH /api/marketing/content/[id] — update fields (caption, scheduledAt, status, etc.)
// DELETE /api/marketing/content/[id] — archive

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const item = await db.contentItem.findUnique({
    where: { id },
    include: {
      reviews: { orderBy: { reviewedAt: 'desc' } },
      queueItems: { orderBy: { scheduledAt: 'asc' } },
    },
  });
  if (!item) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

const patchSchema = z.object({
  title:            z.string().min(1).max(200).optional(),
  platform:         z.enum(['instagram', 'tiktok', 'telegram', 'twitter', 'linkedin', 'youtube', 'whatsapp', 'general']).optional(),
  format:           z.enum(['image', 'video', 'text', 'carousel', 'reel', 'story']).optional(),
  caption:          z.string().optional(),
  script:           z.string().optional(),
  hashtags:         z.array(z.string()).optional(),
  mediaUrl:         z.string().optional(),
  status:           z.enum(['draft', 'in_review', 'approved', 'scheduled', 'published_manual', 'rejected', 'archived']).optional(),
  scheduledAt:      z.string().datetime().nullable().optional(),
  notes:            z.string().optional(),
  riskLevel:        z.enum(['low', 'medium', 'high', 'critical']).optional(),
  score:            z.number().int().min(0).max(100).optional(),
  approvedByAgentId: z.string().optional(),
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

  const { hashtags, scheduledAt, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (hashtags !== undefined) data.hashtags = JSON.stringify(hashtags);
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

  // Auto-set status to 'scheduled' when scheduledAt is set and status is approved
  const existing = await db.contentItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  if (data.scheduledAt && !data.status && existing.status === 'approved') {
    data.status = 'scheduled';
  }

  const item = await db.contentItem.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await db.contentItem.update({ where: { id }, data: { status: 'archived' } });
  return NextResponse.json({ ok: true });
}
