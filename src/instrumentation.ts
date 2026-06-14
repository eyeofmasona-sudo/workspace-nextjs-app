// Next.js server instrumentation — runs once on server startup (Node.js runtime only).
// Seeds the database with default data if empty. Idempotent — safe to call repeatedly.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // 1. Core seed: user, workspace, agents
      const { initializeSystem } = await import('./lib/seed');
      await initializeSystem();

      // 2. Ecosystem seed: skills, packs, marketplace, workflows, capability scores
      const { skillRegistryService } = await import('./lib/skill-registry');
      const { skillPackService, toolPackService } = await import('./lib/packs');
      const { marketplaceService } = await import('./lib/marketplace');
      const { workflowService } = await import('./lib/workflows');
      const { capabilityScoreService } = await import('./lib/capability');
      const { db } = await import('./lib/db');

      await skillRegistryService.seedDefaults();
      await skillPackService.seedDefaults();
      await toolPackService.seedDefaults();
      await marketplaceService.seedDefaults();
      await workflowService.seedDefaults();

      // Seed capability scores for all permanent agents
      const agents = await db.agent.findMany({
        where: { type: 'permanent' },
        select: { id: true, role: true },
      });
      for (const agent of agents) {
        await capabilityScoreService.seedDefaultScores(agent.id, agent.role);
      }

      // 3. Init approval lifecycle (approval.approved → tool execution resume)
      const { initApprovalLifecycle } = await import('./lib/tool-hub');
      initApprovalLifecycle();

      console.log('[Instrumentation] System fully initialized');
    } catch (error) {
      console.error('[Instrumentation] Initialization failed:', error);
    }
  }
}
