// POST /api/workflows/[id]/execute
// Выполняет workflow template пошагово через OrchestratorChatEngine.
//
// Тело запроса (JSON, опционально):
//   { input?: Record<string, unknown>, workspaceId?: string }
//
// Ответ:
//   200 completed|partial  — { result: ExecutionResult }
//   400                    — невалидное тело
//   404                    — шаблон не найден
//   500                    — внутренняя ошибка

import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/lib/workflows';
import { loggers } from '@/lib/logger';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;

  let body: { input?: Record<string, unknown>; workspaceId?: string } = {};
  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await workflowService.executeTemplate(
      id,
      body.input ?? {},
      body.workspaceId
    );

    const status = result.status === 'failed' ? 500 : 200;
    return NextResponse.json({ result }, { status });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    loggers.api.error({ err }, `[API] POST /workflows/${id}/execute error:`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
