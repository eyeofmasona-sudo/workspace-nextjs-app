// GET /api/preview/status — returns current preview process state
import { NextResponse } from 'next/server';
import { previewService } from '@/lib/preview';

export async function GET() {
  const state = previewService.getState();
  return NextResponse.json({ ok: true, state });
}
