// POST /api/marketplace/[key]/rate — Rate a marketplace item

import { NextRequest, NextResponse } from 'next/server';
import { marketplaceService } from '@/lib/marketplace';
import { loggers } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const { rating } = body;

    if (rating === undefined || typeof rating !== 'number') {
      return NextResponse.json(
        { error: 'rating is required and must be a number' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const result = await marketplaceService.rateItem(key, rating);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /marketplace/[key]/rate error:');
    return NextResponse.json(
      { error: 'Failed to rate marketplace item' },
      { status: 500 }
    );
  }
}
