// GET /api/memory/project/[projectId] — summarize project memory

import { NextRequest, NextResponse } from 'next/server';
import { sharedMemoryService } from '@/lib/memory/SharedMemoryService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const summary = await sharedMemoryService.summarizeProject(projectId);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
