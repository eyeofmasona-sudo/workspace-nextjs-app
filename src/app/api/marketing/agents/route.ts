// ─── Marketing Department — Agent Specs API ──────────────────

import { NextRequest, NextResponse } from 'next/server';
import { marketingDepartmentRegistry } from '@/lib/marketing-department';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (agentId) {
      const spec = marketingDepartmentRegistry.getAgentSpec(agentId);
      if (!spec) {
        return NextResponse.json(
          { success: false, error: `Agent spec not found: ${agentId}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: spec });
    }

    const allSpecs = marketingDepartmentRegistry.getAllAgentSpecs();
    return NextResponse.json({ success: true, data: allSpecs });
  } catch (error) {
    loggers.api.error({ err: error }, '[Marketing Agents API] Error:');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
