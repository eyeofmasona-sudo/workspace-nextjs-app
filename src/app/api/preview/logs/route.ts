// GET /api/preview/logs — returns captured stdout/stderr lines
import { NextRequest, NextResponse } from 'next/server';
import { previewService } from '@/lib/preview';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lastN = parseInt(searchParams.get('lastN') ?? '200', 10);
  const logs = previewService.getLogs(lastN);
  return NextResponse.json({ logs, total: logs.length });
}
