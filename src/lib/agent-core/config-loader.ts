// ─── Agent OS — Stage 2: Config Loader ──────────────────────
// Loads agent configs from definitions and registers them.
// This is the bridge between static config definitions and the
// runtime registry.

import type { AgentConfig } from './types';
import { agentRegistry } from './registry';
import { loggingHook, costTrackingHook } from './hooks';

// ─── Config Loader ──────────────────────────────────────────

/**
 * Load agent configs into the registry.
 * Adds built-in hooks (logging, cost tracking) to each config.
 */
export function loadAgentConfigs(configs: AgentConfig[]): {
  loaded: number;
  skipped: number;
} {
  let loaded = 0;
  let skipped = 0;

  for (const config of configs) {
    if (agentRegistry.has(config.id)) {
      skipped++;
      continue;
    }

    // Attach built-in hooks if not already present
    const hooks = [...config.hooks];
    const hasLogging = hooks.some((h) => h.name === 'logging');
    const hasCostTracking = hooks.some((h) => h.name === 'cost-tracking');

    if (!hasLogging) hooks.push(loggingHook);
    if (!hasCostTracking) hooks.push(costTrackingHook);

    agentRegistry.register({
      ...config,
      hooks,
    });

    loaded++;
  }

  console.log(
    `[ConfigLoader] Loaded ${loaded} agent configs, skipped ${skipped} (already registered)`
  );

  return { loaded, skipped };
}

/**
 * Load agent configs from DB (for agents created at runtime).
 * This converts DB rows to AgentConfig and registers them.
 */
export async function loadAgentsFromDb(workspaceId: string): Promise<{
  loaded: number;
  skipped: number;
}> {
  try {
    const { db } = await import('../db');
    const agents = await db.agent.findMany({
      where: { workspaceId },
      include: { modelConfigs: { where: { enabled: true } } },
    });

    let loaded = 0;
    let skipped = 0;

    for (const agent of agents) {
      if (agentRegistry.has(agent.id)) {
        skipped++;
        continue;
      }

      // Convert DB model configs to ModelConfig
      const preferred = agent.modelConfigs.find((c) => c.preferenceType === 'preferred');
      const fallback = agent.modelConfigs.find((c) => c.preferenceType === 'fallback');

      if (!preferred) {
        console.warn(
          `[ConfigLoader] Skipping agent ${agent.name}: no preferred model config`
        );
        skipped++;
        continue;
      }

      const config: AgentConfig = {
        id: agent.id,
        name: agent.name,
        role: agent.role as AgentConfig['role'],
        type: agent.type as AgentConfig['type'],
        description: `${agent.name} — ${agent.role}`,
        systemPrompt: agent.systemPrompt ?? `You are ${agent.name}.`,
        model: {
          preferred: {
            provider: preferred.provider,
            model: preferred.model,
            maxCostPerTask: preferred.maxCostPerTask ?? undefined,
            maxTokens: preferred.maxTokens ?? undefined,
          },
          ...(fallback
            ? {
                fallback: {
                  provider: fallback.provider,
                  model: fallback.model,
                  maxCostPerTask: fallback.maxCostPerTask ?? undefined,
                  maxTokens: fallback.maxTokens ?? undefined,
                },
              }
            : {}),
        },
        execution: {
          temperature: 0.7,
          maxTokens: preferred.maxTokens ?? 2048,
          topP: 1.0,
          maxRetries: 1,
          timeoutMs: 60000,
        },
        skills: [],
        tools: [],
        hooks: [loggingHook, costTrackingHook],
        visualProfile: agent.visualProfile
          ? (JSON.parse(agent.visualProfile as string) as AgentConfig['visualProfile'])
          : { color: '#6B7280', icon: 'Bot', avatarEmoji: '🤖' },
        professionalStyle: agent.professionalStyle
          ? (JSON.parse(agent.professionalStyle as string) as AgentConfig['professionalStyle'])
          : {
              communicationStyle: 'Professional',
              decisionMaking: 'Data-informed',
              attentionToDetail: 'Thorough',
              collaborationStyle: 'Collaborative',
            },
        defaultZone: agent.locationZone,
      };

      agentRegistry.register(config);
      loaded++;
    }

    console.log(
      `[ConfigLoader] Loaded ${loaded} agents from DB, skipped ${skipped}`
    );

    return { loaded, skipped };
  } catch (error) {
    console.error('[ConfigLoader] Failed to load agents from DB:', error);
    return { loaded: 0, skipped: 0 };
  }
}
