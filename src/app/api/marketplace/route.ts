// GET /api/marketplace — Browse marketplace items
// POST /api/marketplace — Publish a new marketplace item

import { NextRequest, NextResponse } from 'next/server';
import { marketplaceService } from '@/lib/marketplace';
import type { MarketplaceFilters } from '@/lib/marketplace';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    const filters: MarketplaceFilters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (search) filters.search = search;

    const items = await marketplaceService.listItems(filters);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[API] GET /marketplace error:', error);
    return NextResponse.json(
      { error: 'Failed to browse marketplace' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, key, name, description } = body;

    if (!type || !key || !name || !description) {
      return NextResponse.json(
        { error: 'type, key, name, and description are required' },
        { status: 400 }
      );
    }

    const validTypes = ['skill_pack', 'tool_pack', 'agent_template', 'workflow_template'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const item = await marketplaceService.publishItem(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /marketplace error:', error);
    return NextResponse.json(
      { error: 'Failed to publish marketplace item' },
      { status: 500 }
    );
  }
}
