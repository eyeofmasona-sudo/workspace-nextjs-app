// POST /api/workflows/[id]/execute
// Возвращает 501 Not Implemented до тех пор, пока не реализована
// реальная оркестрация агентов через OrchestratorEngine (Option B).
//
// Это намеренный guard: агенты и клиенты должны получать явный
// отказ, а не фиктивный success / pending.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;

  // Подтверждаем, что шаблон существует, чтобы сообщение было информативным
  const template = await db.workflowTemplate.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  }).catch(() => null);

  if (!template) {
    return NextResponse.json(
      { error: `Workflow template not found: ${id}` },
      { status: 404 }
    );
  }

  // 501 — исполнение не реализовано
  return NextResponse.json(
    {
      error: 'Workflow execution is not yet implemented.',
      templateId: template.id,
      templateName: template.name,
      hint: 'Use POST /api/orchestrator/chat to run agents manually, or wait for Option B implementation.',
    },
    { status: 501 }
  );
}
