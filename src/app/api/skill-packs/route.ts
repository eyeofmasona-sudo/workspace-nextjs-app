// GET /api/skill-packs — List all skill packs
// POST /api/skill-packs — Seed default skill packs

import { NextRequest, NextResponse } from 'next/server';
import { skillPackService } from '@/lib/packs';
import { loggers } from '@/lib/logger';

export async function GET() {
  try {
    const packs = await skillPackService.listPacks();
    return NextResponse.json({ packs });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /skill-packs error:');
    return NextResponse.json(
      { error: 'Failed to fetch skill packs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'seed') {
      const result = await skillPackService.seedDefaults();
      return NextResponse.json({ result }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported: "seed"' },
      { status: 400 }
    );
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /skill-packs error:');
    return NextResponse.json(
      { error: 'Failed to process skill packs request' },
      { status: 500 }
    );
  }
}
