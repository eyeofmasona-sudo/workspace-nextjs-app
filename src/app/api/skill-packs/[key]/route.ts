// GET /api/skill-packs/:key — Get a single skill pack with items

import { NextRequest, NextResponse } from 'next/server';
import { skillPackService } from '@/lib/packs';
import { loggers } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const pack = await skillPackService.getPack(key);

    if (!pack) {
      return NextResponse.json(
        { error: `Skill pack not found: ${key}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ pack });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /skill-packs/:key error:');
    return NextResponse.json(
      { error: 'Failed to fetch skill pack' },
      { status: 500 }
    );
  }
}
