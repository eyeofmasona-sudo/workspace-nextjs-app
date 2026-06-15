// GET /api/tools — List all tools (with optional filters)
// POST /api/tools — Create a new tool

import { NextRequest, NextResponse } from 'next/server';
import { toolRegistryService } from '@/lib/tool-hub/ToolRegistryService';
import { createToolSchema } from '@/lib/validations';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const category = searchParams.get('category');

    if (category && workspaceId) {
      const tools = await toolRegistryService.getToolsByCategory(category, workspaceId);
      return NextResponse.json({ tools });
    }

    const tools = await toolRegistryService.getTools(workspaceId ?? undefined);
    return NextResponse.json({ tools });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] GET /tools error:');
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createToolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const tool = await toolRegistryService.createTool(parsed.data);
    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] POST /tools error:');
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }
}
