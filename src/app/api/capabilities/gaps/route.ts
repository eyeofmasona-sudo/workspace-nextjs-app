// GET /api/capabilities/gaps — Get system capability gaps

import { NextResponse } from 'next/server';
import { capabilityScoreService } from '@/lib/capability';

export async function GET() {
  try {
    const gaps = await capabilityScoreService.getSystemGaps();
    return NextResponse.json({ gaps });
  } catch (error) {
    console.error('[API] GET /capabilities/gaps error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capability gaps' },
      { status: 500 }
    );
  }
}
