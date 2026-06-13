// GET /api/capabilities/scores — Get capability scores (by agent or leaderboard)
// POST /api/capabilities/scores — Update a capability score

import { NextRequest, NextResponse } from 'next/server';
import { capabilityScoreService } from '@/lib/capability';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const capabilityKey = searchParams.get('capabilityKey');
    const leaderboard = searchParams.get('leaderboard');

    // Leaderboard mode: get ranked agents for a capability
    if (leaderboard === 'true' && capabilityKey) {
      const entries = await capabilityScoreService.getLeaderboard(capabilityKey);
      return NextResponse.json({ leaderboard: entries });
    }

    // Agent mode: get all scores for an agent
    if (agentId) {
      const scores = await capabilityScoreService.getAgentScores(agentId);
      return NextResponse.json({ scores });
    }

    // Return available categories if no params
    return NextResponse.json({
      categories: capabilityScoreService.getScoreCategories(),
    });
  } catch (error) {
    console.error('[API] GET /capabilities/scores error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capability scores' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, capabilityKey, score, evidence } = body;

    if (!agentId || !capabilityKey || score === undefined) {
      return NextResponse.json(
        { error: 'agentId, capabilityKey, and score are required' },
        { status: 400 }
      );
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json(
        { error: 'Score must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    const result = await capabilityScoreService.updateScore(
      agentId,
      capabilityKey,
      score,
      evidence
    );

    return NextResponse.json({ score: result }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /capabilities/scores error:', error);
    return NextResponse.json(
      { error: 'Failed to update capability score' },
      { status: 500 }
    );
  }
}
