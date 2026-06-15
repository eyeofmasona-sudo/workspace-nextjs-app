// POST /api/skill-packs/:key/install — Install a skill pack to an agent

import { NextRequest, NextResponse } from 'next/server';
import { skillPackService } from '@/lib/packs';
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

    const result = await skillPackService.installPack(key, agentId);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to install skill pack';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    loggers.api.error({ err: error }, '[API] POST /skill-packs/:key/install error:');
    return NextResponse.json(
      { error: 'Failed to install skill pack' },
      { status: 500 }
    );
  }
}
