// ─── Marketing Department — Info API ─────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { marketingDepartmentRegistry } from '@/lib/marketing-department';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const info = marketingDepartmentRegistry.getDepartmentInfo();
    return NextResponse.json({
      success: true,
      data: info,
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[Marketing API] Failed to get department info:');
    return NextResponse.json(
      { success: false, error: 'Failed to get marketing department info' },
      { status: 500 }
    );
  }
}
