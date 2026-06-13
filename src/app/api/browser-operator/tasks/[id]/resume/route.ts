/**
 * POST /api/browser-operator/tasks/:id/resume
 *
 * Resume a needs_human task after manual intervention.
 * The user has completed login/captcha/2FA in the headful browser,
 * and this endpoint signals the service to continue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBrowserOperatorService } from '@/lib/browser-operator';

function validateApiKey(request: NextRequest): boolean {
  const requiredKey = process.env.BROWSER_OPERATOR_API_KEY;
  if (!requiredKey) return true;
  const providedKey = request.headers.get('x-browser-operator-key')
    ?? request.nextUrl.searchParams.get('key');
  return providedKey === requiredKey;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const service = getBrowserOperatorService();
    const result = await service.resumeTask(id);

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404
      : message.includes('not in needs_human') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
