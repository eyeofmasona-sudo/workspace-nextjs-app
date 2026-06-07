// GET /api/agents/:id/permissions — Get agent permissions
// PATCH /api/agents/:id/permissions — Update agent permissions (array, each is an upsert)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agentPermissionService } from '@/lib/agent-system';
import { updatePermissionSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const permissions = await agentPermissionService.getAgentPermissions(id);
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('[API] GET /agents/:id/permissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent permissions' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate input with zod (array schema)
    const parseResult = updatePermissionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Upsert each permission
    const updatedPermissions: Record<string, unknown>[] = [];
    for (const item of parseResult.data) {
      const permissionLevel = item.permissionLevel ?? 'none';
      const updated = await agentPermissionService.setAgentPermission(
        id,
        item.permissionKey,
        permissionLevel,
        item.constraints
      );
      updatedPermissions.push(updated as Record<string, unknown>);
    }

    return NextResponse.json({ permissions: updatedPermissions });
  } catch (error) {
    console.error('[API] PATCH /agents/:id/permissions error:', error);
    return NextResponse.json({ error: 'Failed to update agent permissions' }, { status: 500 });
  }
}
