// ─── Agent OS — Agent Config Definitions ────────────────────
// Barrel export for all agent config definitions.
// Add new agent configs here when creating new agents.

import type { AgentConfig } from '../agent-core/types';
import { orchestratorConfig } from './orchestrator';
import { frontendEngineerConfig } from './frontend-engineer';
import { researcherConfig } from './researcher';

/**
 * All built-in agent config definitions.
 * These are loaded into the AgentRegistry at startup.
 */
export const AGENT_CONFIGS: AgentConfig[] = [
  orchestratorConfig,
  frontendEngineerConfig,
  researcherConfig,
];

/**
 * Get a config by agent ID.
 */
export function getAgentConfig(id: string): AgentConfig | undefined {
  return AGENT_CONFIGS.find((c) => c.id === id);
}

/**
 * List all config IDs.
 */
export function listConfigIds(): string[] {
  return AGENT_CONFIGS.map((c) => c.id);
}
