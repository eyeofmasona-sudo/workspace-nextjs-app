/**
 * GET /api/browser-operator/providers
 *
 * List available browser providers with their current status.
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

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = getBrowserOperatorService();
    const response = service.getProviders();

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
