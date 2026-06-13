// POST /api/skills/:key/toggle — Enable or disable a skill for an agent

import { NextRequest, NextResponse } from 'next/server';
import { skillRegistryService } from '@/lib/skill-registry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const { agentId, enabled } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled (boolean) is required' },
        { status: 400 }
      );
    }

    const result = enabled
      ? await skillRegistryService.enableSkill(agentId, key)
      : await skillRegistryService.disableSkill(agentId, key);

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle skill';
    if (message.includes('not found') || message.includes('not installed')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[API] POST /skills/:key/toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle skill' },
      { status: 500 }
    );
  }
}
