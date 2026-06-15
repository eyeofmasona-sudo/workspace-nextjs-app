// POST /api/preview/start
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { previewService } from '@/lib/preview';

const schema = z.object({
  projectPath: z.string().min(1),
  port: z.number().int().min(1024).max(65535).optional().default(3100),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const result = await previewService.start(parsed.data.projectPath, parsed.data.port);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
