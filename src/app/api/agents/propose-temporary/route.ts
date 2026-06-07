// POST /api/agents/propose-temporary — Propose a temporary agent

import { NextRequest, NextResponse } from 'next/server';
import { temporaryAgentService } from '@/lib/agent-system';
import { proposeTemporaryAgentSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with zod
    const parseResult = proposeTemporaryAgentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { workspaceId, purpose } = parseResult.data;
    const proposal = await temporaryAgentService.proposeTemporaryAgent(workspaceId, purpose);

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /agents/propose-temporary error:', error);
    return NextResponse.json({ error: 'Failed to propose temporary agent' }, { status: 500 });
  }
}
