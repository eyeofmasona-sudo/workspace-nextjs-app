/**
 * POST /api/browser-operator/tasks/:id/retry
 *
 * Retry a failed browser operator task.
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
    const task = await service.retryTask(id);

    return NextResponse.json({ task });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404
      : message.includes('Cannot retry') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
