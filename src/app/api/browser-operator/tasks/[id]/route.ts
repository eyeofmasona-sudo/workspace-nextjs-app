/**
 * GET /api/browser-operator/tasks/:id
 *
 * Get a specific browser operator task by ID.
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const service = getBrowserOperatorService();
    const task = service.getTask(id);

    if (!task) {
      return NextResponse.json(
        { error: `Task "${id}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({ task });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
