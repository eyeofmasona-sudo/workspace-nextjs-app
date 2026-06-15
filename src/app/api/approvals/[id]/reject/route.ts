// POST /api/approvals/:id/reject — Reject a pending approval request
// C7 FIX: Workspace-scoped — caller must belong to the same workspace as the approval.

import { NextRequest, NextResponse } from 'next/server';
import { approvalSystem } from '@/lib/approval';
import { loggers } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const callerWorkspaceId = searchParams.get('workspaceId');

    // Workspace guard: if caller provides workspaceId, verify ownership
    if (callerWorkspaceId) {
      const approval = await approvalSystem.get(id);
      if (!approval) {
        return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
      }
      if (approval.workspaceId && approval.workspaceId !== callerWorkspaceId) {
        return NextResponse.json({ error: 'Forbidden: approval belongs to another workspace' }, { status: 403 });
      }
    }

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

    loggers.api.error({ err: error }, '[API] POST /approvals/:id/reject error:');
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
  }
}
