// POST /api/agents/create-temporary — Create a temporary agent

import { NextRequest, NextResponse } from 'next/server';
import { temporaryAgentService } from '@/lib/agent-system';
import { createTemporaryAgentSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with zod
    const parseResult = createTemporaryAgentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { workspaceId, approvedConfig } = parseResult.data;
    const agent = await temporaryAgentService.createTemporaryAgent({
      workspaceId,
      approvedConfig: {
        ...approvedConfig,
        capabilities: approvedConfig.capabilities.map((c) => ({
          capabilityKey: c.capabilityKey,
          level: c.level,
        })),
        permissions: approvedConfig.permissions.map((p) => ({
          permissionKey: p.permissionKey,
          permissionLevel: p.permissionLevel,
        })),
        preferredModel: approvedConfig.preferredModel,
        fallbackModel: approvedConfig.fallbackModel,
        risks: approvedConfig.risks,
        estimatedUseCases: approvedConfig.estimatedUseCases,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /agents/create-temporary error:', error);
    return NextResponse.json({ error: 'Failed to create temporary agent' }, { status: 500 });
  }
}
