// POST /api/marketing/content/[id]/review
// Brand Guardian records review result → transitions to approved/rejected

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({
  agentId:     z.string().optional(),
  agentName:   z.string().optional(),
  status:      z.enum(['approved', 'rejected', 'needs_changes']),
  score:       z.number().int().min(0).max(100).optional().default(0),
  riskLevel:   z.enum(['low', 'medium', 'high', 'critical']).optional().default('low'),
  notes:       z.string().optional(),
  issues:      z.array(z.string()).optional().default([]),
  suggestions: z.array(z.string()).optional().default([]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const existing = await db.contentItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Content item not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { agentId, agentName, status, score, riskLevel, notes, issues, suggestions } = parsed.data;

  // Create ContentReview record
  const review = await db.contentReview.create({
    data: {
      contentItemId: id,
      agentId:       agentId ?? null,
      agentName:     agentName ?? null,
      status,
      score,
      riskLevel,
      notes:       notes ?? null,
      issues:      JSON.stringify(issues),
      suggestions: JSON.stringify(suggestions),
    },
  });

  // Transition ContentItem status
  const newStatus =
    status === 'approved'       ? 'approved'   :
    status === 'rejected'       ? 'rejected'   : 'in_review';

  const updatedItem = await db.contentItem.update({
    where: { id },
    data: {
      status:            newStatus,
      score,
      riskLevel,
      ...(status === 'approved' && agentId ? { approvedByAgentId: agentId } : {}),
    },
    include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 3 } },
  });

  return NextResponse.json({ ok: true, item: updatedItem, review });
}
