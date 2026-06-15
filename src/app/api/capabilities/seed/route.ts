// POST /api/capabilities/seed — Seed default capability scores for an agent

import { NextRequest, NextResponse } from 'next/server';
import { capabilityScoreService } from '@/lib/capability';
import { loggers } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, role } = body;

    if (!agentId || !role) {
      return NextResponse.json(
        { error: 'agentId and role are required' },
        { status: 400 }
      );
    }

    const result = await capabilityScoreService.seedDefaultScores(agentId, role);

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    loggers.seed.error({ err: error }, '[API] POST /capabilities/seed error:');
    return NextResponse.json(
      { error: 'Failed to seed default scores' },
      { status: 500 }
    );
  }
}
