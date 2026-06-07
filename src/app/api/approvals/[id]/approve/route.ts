// POST /api/approvals/:id/approve — Approve a pending approval request

import { NextRequest, NextResponse } from 'next/server';
import { approvalSystem } from '@/lib/approval';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await approvalSystem.approve(id);

    return NextResponse.json({
      approval: result,
      message: 'Approval granted',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Distinguish "not found" / "not pending" from real errors
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('not pending')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error('[API] POST /approvals/:id/approve error:', error);
    return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
  }
}
