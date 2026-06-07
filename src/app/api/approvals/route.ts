// GET /api/approvals — List approval requests

import { NextRequest, NextResponse } from 'next/server';
import { approvalSystem } from '@/lib/approval';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const taskId = searchParams.get('taskId');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    if (taskId) {
      const approvals = await approvalSystem.getByTask(taskId);
      return NextResponse.json({ approvals });
    }

    const approvals = await approvalSystem.getPending(workspaceId ?? undefined, limit);
    return NextResponse.json({ approvals });
  } catch (error) {
    console.error('[API] GET /approvals error:', error);
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
}
