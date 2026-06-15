// POST /api/skill-packs/:key/uninstall — Uninstall a skill pack from an agent

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

    const result = await skillPackService.uninstallPack(key, agentId);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to uninstall skill pack';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    loggers.api.error({ err: error }, '[API] POST /skill-packs/:key/uninstall error:');
    return NextResponse.json(
      { error: 'Failed to uninstall skill pack' },
      { status: 500 }
    );
  }
}
