// GET /api/skills/:key — Get a single skill by key

import { NextRequest, NextResponse } from 'next/server';
import { skillRegistryService } from '@/lib/skill-registry';
import { loggers } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const skill = await skillRegistryService.getSkill(key);

    if (!skill) {
      return NextResponse.json(
        { error: `Skill not found: ${key}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ skill });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /skills/:key error:');
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}
