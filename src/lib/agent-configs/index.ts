// ─── Agent OS — Agent Config Definitions ────────────────────
// Barrel export for all agent config definitions.
// Add new agent configs here when creating new agents.

import type { AgentConfig } from '../agent-core/types';
import { orchestratorConfig } from './orchestrator';
import { researcherConfig } from './researcher';
import { frontendEngineerConfig } from './frontend-engineer';
import { analystConfig } from './analyst';
import { architectConfig } from './architect';
import { designerConfig } from './designer';
import { backendEngineerConfig } from './backend-engineer';
import { dataEngineerConfig } from './data-engineer';
import { qaEngineerConfig } from './qa-engineer';
import { devopsEngineerConfig } from './devops-engineer';
import { securityEngineerConfig } from './security-engineer';
import { marketingLeadConfig } from './marketing-lead';
import { marketResearcherConfig } from './market-researcher';
import { contentStrategistConfig } from './content-strategist';
import { growthManagerConfig } from './growth-manager';
import { marketingAnalystConfig } from './marketing-analyst';
import { trendAnalystConfig } from './trend-analyst';
import { copywriterConfig } from './copywriter';
import { visualDesignerMarketingConfig } from './visual-designer-marketing';
import { videoEditorConfig } from './video-editor';
import { publisherConfig } from './publisher';
import { communityManagerConfig } from './community-manager';
import { messengerSupportConfig } from './messenger-support';
import { salesAgentConfig } from './sales-agent';
import { brandGuardianConfig } from './brand-guardian';

/**
 * All built-in agent config definitions.
 * These are loaded into the AgentRegistry at startup.
 */
export const AGENT_CONFIGS: AgentConfig[] = [
  orchestratorConfig,
  researcherConfig,
  frontendEngineerConfig,
  analystConfig,
  architectConfig,
  designerConfig,
  backendEngineerConfig,
  dataEngineerConfig,
  qaEngineerConfig,
  devopsEngineerConfig,
  securityEngineerConfig,
  marketingLeadConfig,
  marketResearcherConfig,
  contentStrategistConfig,
  growthManagerConfig,
  marketingAnalystConfig,
  // Full marketing team expansion
  trendAnalystConfig,
  copywriterConfig,
  visualDesignerMarketingConfig,
  videoEditorConfig,
  publisherConfig,
  communityManagerConfig,
  messengerSupportConfig,
  salesAgentConfig,
  brandGuardianConfig,
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
