// POST /api/skills/:key/install — Install a skill to an agent

import { NextRequest, NextResponse } from 'next/server';
import { skillRegistryService } from '@/lib/skill-registry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const { agentId, score } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    const result = await skillRegistryService.installSkill(
      agentId,
      key,
      score ?? 50
    );

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to install skill';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[API] POST /skills/:key/install error:', error);
    return NextResponse.json(
      { error: 'Failed to install skill' },
      { status: 500 }
    );
  }
}
