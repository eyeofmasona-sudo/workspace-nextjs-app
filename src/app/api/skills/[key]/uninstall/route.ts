// POST /api/skills/:key/uninstall — Uninstall a skill from an agent

import { NextRequest, NextResponse } from 'next/server';
import { skillRegistryService } from '@/lib/skill-registry';
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

    const result = await skillRegistryService.uninstallSkill(agentId, key);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to uninstall skill';
    if (message.includes('not found') || message.includes('not installed')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    loggers.api.error({ err: error }, '[API] POST /skills/:key/uninstall error:');
    return NextResponse.json(
      { error: 'Failed to uninstall skill' },
      { status: 500 }
    );
  }
}
