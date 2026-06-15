// POST /api/seed-ecosystem — One-click seed the entire ecosystem
// Seeds skills, packs, marketplace items, capability scores, and workflow templates

import { NextResponse } from 'next/server';
import { skillRegistryService } from '@/lib/skill-registry';
import { skillPackService, toolPackService } from '@/lib/packs';
import { marketplaceService } from '@/lib/marketplace';
import { workflowService } from '@/lib/workflows';
import { capabilityScoreService } from '@/lib/capability';
import { db } from '@/lib/db';
import { loggers } from '@/lib/logger';

export async function POST() {
  try {
    // 1. Seed skill definitions
    const skillResult = await skillRegistryService.seedDefaults();

    // 2. Seed skill packs + items
    const skillPackResult = await skillPackService.seedDefaults();

    // 3. Seed tool packs + items
    const toolPackResult = await toolPackService.seedDefaults();

    // 4. Seed marketplace items
    const marketplaceResult = await marketplaceService.seedDefaults();

    // 5. Seed workflow templates
    const workflowResult = await workflowService.seedDefaults();

    // 6. Seed capability scores for all permanent agents
    const agents = await db.agent.findMany({
      where: { type: 'permanent' },
      select: { id: true, role: true },
    });

    let capabilityCreated = 0;
    let capabilitySkipped = 0;
    for (const agent of agents) {
      const result = await capabilityScoreService.seedDefaultScores(agent.id, agent.role);
      capabilityCreated += result.created;
      capabilitySkipped += result.skipped;
    }

    return NextResponse.json({
      success: true,
      results: {
        skills: skillResult,
        skillPacks: skillPackResult,
        toolPacks: toolPackResult,
        marketplace: marketplaceResult,
        workflows: workflowResult,
        capabilityScores: { created: capabilityCreated, skipped: capabilitySkipped },
      },
    }, { status: 201 });
  } catch (error) {
    loggers.seed.error({ err: error }, '[API] POST /seed-ecosystem error:');
    return NextResponse.json(
      { error: 'Failed to seed ecosystem' },
      { status: 500 }
    );
  }
}
