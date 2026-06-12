/**
 * POST /api/browser-operator/tasks
 *
 * Submit a new browser automation task.
 *
 * Body: BrowserTaskInput
 * Response: BrowserTaskApiResponse
 *
 * Security:
 * - Requires BROWSER_OPERATOR_API_KEY from .env (if set)
 * - Localhost-only (enforced by gateway)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBrowserOperatorService } from '@/lib/browser-operator';
import type { BrowserTaskInput } from '@/lib/browser-operator';

// ── API Key check ──────────────────────────────────────────────
function validateApiKey(request: NextRequest): boolean {
  const requiredKey = process.env.BROWSER_OPERATOR_API_KEY;
  if (!requiredKey) return true; // No key configured = open (dev mode)

  const providedKey = request.headers.get('x-browser-operator-key')
    ?? request.nextUrl.searchParams.get('key');

  return providedKey === requiredKey;
}

export async function POST(request: NextRequest) {
  // Security: API key check
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid or missing API key' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json() as Partial<BrowserTaskInput>;

    // Validate required fields
    if (!body.provider) {
      return NextResponse.json(
        { error: 'Missing required field: provider' },
        { status: 400 },
      );
    }
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 },
      );
    }
    if (!body.mode) {
      return NextResponse.json(
        { error: 'Missing required field: mode (navigate|extract|interact|automate)' },
        { status: 400 },
      );
    }

    const validModes = ['navigate', 'extract', 'interact', 'automate'];
    if (!validModes.includes(body.mode)) {
      return NextResponse.json(
        { error: `Invalid mode "${body.mode}". Valid: ${validModes.join(', ')}` },
        { status: 400 },
      );
    }

    const service = getBrowserOperatorService();
    const task = await service.submitTask({
      provider: body.provider,
      prompt: body.prompt,
      url: body.url,
      mode: body.mode,
      agentId: body.agentId,
      taskId: body.taskId,
      priority: body.priority ?? 'normal',
      timeout: body.timeout,
      options: body.options,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/browser-operator/tasks
 *
 * List browser operator tasks. Optional query params:
 *   ?status=queued|running|completed|failed|needs_human|cancelled
 */
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const status = request.nextUrl.searchParams.get('status') as BrowserTaskInput['mode'] | null;
    const service = getBrowserOperatorService();
    const tasks = service.listTasks(status as any || undefined);

    return NextResponse.json({
      tasks,
      stats: service.getStats(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
