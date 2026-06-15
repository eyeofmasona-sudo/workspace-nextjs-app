// GET /api/tool-packs/:key — Get a single tool pack with items

import { NextRequest, NextResponse } from 'next/server';
import { toolPackService } from '@/lib/packs';
import { loggers } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const pack = await toolPackService.getPack(key);

    if (!pack) {
      return NextResponse.json(
        { error: `Tool pack not found: ${key}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ pack });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /tool-packs/:key error:');
    return NextResponse.json(
      { error: 'Failed to fetch tool pack' },
      { status: 500 }
    );
  }
}
