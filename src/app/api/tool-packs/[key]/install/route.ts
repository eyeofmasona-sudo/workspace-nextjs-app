// POST /api/tool-packs/:key/install — Install a tool pack to an agent

import { NextRequest, NextResponse } from 'next/server';
import { toolPackService } from '@/lib/packs';
import { loggers } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    const result = await toolPackService.installPack(key, agentId);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to install tool pack';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    loggers.api.error({ err: error }, '[API] POST /tool-packs/:key/install error:');
    return NextResponse.json(
      { error: 'Failed to install tool pack' },
      { status: 500 }
    );
  }
}
