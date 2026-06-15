// GET  /api/marketing/content — list content items (filter by status/platform)
// POST /api/marketing/content — create draft content item

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// ── GET ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') ?? undefined;
  const status      = searchParams.get('status') ?? undefined;
  const platform    = searchParams.get('platform') ?? undefined;
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  const where: Record<string, unknown> = {};
  if (workspaceId) where.workspaceId = workspaceId;
  if (status)      where.status = status;
  if (platform)    where.platform = platform;

  const items = await db.contentItem.findMany({
    where,
    include: {
      reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 },
      queueItems: { orderBy: { scheduledAt: 'asc' }, take: 1 },
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({ ok: true, items, count: items.length });
}

// ── POST ──────────────────────────────────────────────────────

const createSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string().optional(),
  title: z.string().min(1).max(200),
  platform: z.enum(['instagram', 'tiktok', 'telegram', 'twitter', 'linkedin', 'youtube', 'whatsapp', 'general']),
  format: z.enum(['image', 'video', 'text', 'carousel', 'reel', 'story']).optional().default('text'),
  caption: z.string().optional().default(''),
  script: z.string().optional().default(''),
  hashtags: z.array(z.string()).optional().default([]),
  mediaUrl: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  createdByAgentId: z.string().optional(),
  notes: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional().default('low'),
  score: z.number().int().min(0).max(100).optional().default(0),
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

  const { hashtags, scheduledAt, ...rest } = parsed.data;

  const item = await db.contentItem.create({
    data: {
      ...rest,
      hashtags: JSON.stringify(hashtags),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: 'draft',
    },
  });

  return NextResponse.json({ ok: true, item }, { status: 201 });
}
