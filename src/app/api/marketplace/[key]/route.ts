// GET /api/marketplace/[key] — Get marketplace item details
// POST /api/marketplace/[key] — Install from marketplace

import { NextRequest, NextResponse } from 'next/server';
import { marketplaceService } from '@/lib/marketplace';
import { loggers } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const item = await marketplaceService.getItem(key);

    if (!item) {
      return NextResponse.json(
        { error: `Marketplace item not found: ${key}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /marketplace/[key] error:');
    return NextResponse.json(
      { error: 'Failed to fetch marketplace item' },
      { status: 500 }
    );
  }
}

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

    const result = await marketplaceService.installFromMarketplace(key, agentId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /marketplace/[key] error:');
    return NextResponse.json(
      { error: 'Failed to install from marketplace' },
      { status: 500 }
    );
  }
}
