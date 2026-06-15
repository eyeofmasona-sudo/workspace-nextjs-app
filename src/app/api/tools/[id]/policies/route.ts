// GET /api/tools/[id]/policies — Get tool permission policies
// PATCH /api/tools/[id]/policies — Update tool permission policies

import { NextRequest, NextResponse } from 'next/server';
import { toolRegistryService } from '@/lib/tool-hub/ToolRegistryService';
import { toolPermissionService } from '@/lib/tool-hub/ToolPermissionService';
import { updateToolPolicySchema } from '@/lib/validations';
import { loggers } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify tool exists
    const tool = await toolRegistryService.getTool(id);
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const policies = await toolPermissionService.getToolPolicies(id);
    return NextResponse.json({ policies });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] GET /tools/[id]/policies error:');
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify tool exists
    const tool = await toolRegistryService.getTool(id);
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateToolPolicySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Upsert each policy
    const results: Array<{
      id: string;
      toolId: string;
      permissionKey: string;
      requiredLevel: string;
      constraints: Record<string, unknown> | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    for (const policy of parsed.data) {
      const result = await toolPermissionService.setToolPolicy(
        id,
        policy.permissionKey,
        policy.requiredLevel,
        policy.constraints
      );
      results.push(result);
    }

    return NextResponse.json({ policies: results });
  } catch (error) {
    loggers.toolHub.error({ err: error }, '[API] PATCH /tools/[id]/policies error:');
    return NextResponse.json({ error: 'Failed to update policies' }, { status: 500 });
  }
}
