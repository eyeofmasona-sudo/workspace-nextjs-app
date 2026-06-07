// POST /api/approvals/:id/reject — Reject a pending approval request

import { NextRequest, NextResponse } from 'next/server';
import { approvalSystem } from '@/lib/approval';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await approvalSystem.reject(id);

    return NextResponse.json({
      approval: result,
      message: 'Approval rejected',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('not pending')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error('[API] POST /approvals/:id/reject error:', error);
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
  }
}
