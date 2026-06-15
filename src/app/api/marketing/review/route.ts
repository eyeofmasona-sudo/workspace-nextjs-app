// POST /api/marketing/review — run ContentReviewService on text

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { contentReviewService } from '@/lib/marketing/ContentReviewService';
import { sharedMemoryService } from '@/lib/memory/SharedMemoryService';
import { db } from '@/lib/db';

const schema = z.object({
  text: z.string().min(1).max(65_000),
  platform: z.string().optional().default('general'),
  workspaceId: z.string().optional(),
  agentId: z.string().optional(),
  agentRole: z.string().optional(),
  // If true, store high-risk findings as memory items automatically
  autoRemember: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { text, platform, workspaceId, agentId, agentRole, autoRemember } = parsed.data;

  const result = contentReviewService.reviewContent(text, { platform, workspaceId, agentRole });

  // Auto-create approval request for high/critical risk
  if (result.blockedFromPublishing && workspaceId && agentId) {
    try {
      const agent = await db.agent.findFirst({ where: { id: agentId } });
      if (agent) {
        await db.approvalRequest.create({
          data: {
            agentId: agent.id,
            workspaceId,
            actionType: 'content_review',
            summary: `Brand Guardian review required — ${result.riskLevel} risk content (score: ${result.score}/100)`,
            risk: result.riskLevel === 'critical' ? 'critical' : 'high',
            payload: JSON.stringify({
              score: result.score,
              riskLevel: result.riskLevel,
              platform,
              issues: result.issues.slice(0, 5),
              contentPreview: text.slice(0, 200),
            }),
            status: 'pending',
          },
        });
      }
    } catch {}
  }

  // Auto-store brand rule violations in memory
  if (autoRemember && workspaceId && result.riskLevel !== 'low' && result.issues.length > 0) {
    sharedMemoryService.remember({
      workspaceId,
      agentId: agentId ?? undefined,
      type: 'risk',
      title: `Content review: ${result.riskLevel} risk on ${platform}`,
      content: `Score: ${result.score}/100\nIssues:\n${result.issues.slice(0, 5).join('\n')}\nFixes:\n${result.suggestedFixes.slice(0, 3).join('\n')}`,
      tags: ['content-review', result.riskLevel, platform],
      importance: result.riskLevel === 'critical' ? 'critical' : result.riskLevel === 'high' ? 'high' : 'medium',
      visibility: 'workspace',
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, result });
}
