// GET /api/tool-packs — List all tool packs
// POST /api/tool-packs — Seed default tool packs

import { NextRequest, NextResponse } from 'next/server';
import { toolPackService } from '@/lib/packs';
import { loggers } from '@/lib/logger';

export async function GET() {
  try {
    const packs = await toolPackService.listPacks();
    return NextResponse.json({ packs });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /tool-packs error:');
    return NextResponse.json(
      { error: 'Failed to fetch tool packs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'seed') {
      const result = await toolPackService.seedDefaults();
      return NextResponse.json({ result }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported: "seed"' },
      { status: 400 }
    );
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /tool-packs error:');
    return NextResponse.json(
      { error: 'Failed to process tool packs request' },
      { status: 500 }
    );
  }
}
