// GET /api/tools/[id] — Get a single tool
// PATCH /api/tools/[id] — Update a tool

import { NextRequest, NextResponse } from 'next/server';
import { toolRegistryService } from '@/lib/tool-hub/ToolRegistryService';
import { updateToolSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tool = await toolRegistryService.getTool(id);

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json({ tool });
  } catch (error) {
    console.error('[API] GET /tools/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch tool' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateToolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const tool = await toolRegistryService.updateTool(id, parsed.data);
    return NextResponse.json({ tool });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update tool';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[API] PATCH /tools/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }
}
