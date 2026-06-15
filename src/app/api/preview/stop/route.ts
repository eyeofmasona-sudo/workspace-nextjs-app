// POST /api/preview/stop
import { NextResponse } from 'next/server';
import { previewService } from '@/lib/preview';

export async function POST() {
  const result = await previewService.stop();
  return NextResponse.json(result);
}
