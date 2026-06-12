// ─── Agent OS — Agent Model Config Service ───────────────────
// Manages preferred/fallback model configurations for agents.

import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';

// ─── Default Models per Role ─────────────────────────────────

interface RoleModels {
  preferred: { provider: string; model: string };
  fallback: { provider: string; model: string };
}

// ─── OpenRouter model assignments per role ──────────────────────
// All models go through OpenRouter (provider = "openrouter").
// Each agent gets a model suited to its role:
//   - Orchestrator/Architect: Claude 3.5 Sonnet (strong reasoning)
//   - Engineers: GPT-4o (great code generation)
//   - Researcher/Analyst: Claude 3.5 Sonnet (thorough analysis)
//   - Designer: Gemini 2.0 Flash (fast, creative)
//   - DevOps/QA: Llama 3.1 70B (efficient, structured)
//   - Fallbacks: Cheaper models for resilience

const DEFAULT_MODELS: Record<string, RoleModels> = {
  _default: {
    preferred: { provider: 'openrouter', model: 'openai/gpt-4o' },
    fallback: { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
  },
  // Orchestrator needs strong reasoning & coordination
  orchestrator: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o' },
  },
  // Analyst needs thorough analysis
  analyst: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o' },
  },
  // Architect needs deep reasoning
  architect: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o' },
  },
  // Designer benefits from fast creative output
  designer: {
    preferred: { provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o' },
  },
  // Frontend Engineer: GPT-4o excels at code
  frontend_engineer: {
    preferred: { provider: 'openrouter', model: 'openai/gpt-4o' },
    fallback: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
  },
  // Backend Engineer: GPT-4o for robust API code
  backend_engineer: {
    preferred: { provider: 'openrouter', model: 'openai/gpt-4o' },
    fallback: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
  },
  // Data Engineer: Claude for schema/query reasoning
  data_engineer: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o' },
  },
  // QA Engineer: Llama 3.1 70B for structured test logic
  qa_engineer: {
    preferred: { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o' },
  },
  // DevOps: Llama 3.1 70B for infrastructure automation
  devops_engineer: {
    preferred: { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
    fallback: { provider: 'openrouter', model: 'openai/gpt-4o' },
  },
  // Researcher: Claude for thorough, well-sourced analysis
  researcher: {
    preferred: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    fallback: { provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
  },
};

// ─── Agent Model Config Service ──────────────────────────────

class AgentModelConfigService {
  private static instance: AgentModelConfigService | null = null;

  private constructor() {}

  static getInstance(): AgentModelConfigService {
    if (!AgentModelConfigService.instance) {
      AgentModelConfigService.instance = new AgentModelConfigService();
    }
    return AgentModelConfigService.instance;
  }

  /**
   * Get all model configs for an agent
   */
  async getAgentModels(agentId: string) {
    return db.agentModelConfig.findMany({
      where: { agentId },
      orderBy: [
        { preferenceType: 'asc' }, // 'fallback' < 'preferred' alphabetically, but we want preferred first
      ],
    });
  }

  /**
   * Set the preferred model for an agent (upsert)
   */
  async setPreferredModel(agentId: string, provider: string, model: string) {
    // Find existing preferred config
    const existing = await db.agentModelConfig.findFirst({
      where: { agentId, preferenceType: 'preferred' },
    });

    let config;

    if (existing) {
      config = await db.agentModelConfig.update({
        where: { id: existing.id },
        data: { provider, model, enabled: true },
      });
    } else {
      config = await db.agentModelConfig.create({
        data: {
          agentId,
          provider,
          model,
          preferenceType: 'preferred',
          enabled: true,
        },
      });
    }

    await eventBus.emit(EventTypes.AGENT_MODEL_CONFIG_UPDATED, {
      agentId,
      configId: config.id,
      provider,
      model,
      preferenceType: 'preferred',
      enabled: config.enabled,
      timestamp: Date.now(),
      source: 'agent-model-config-service',
    });

    return config;
  }

  /**
   * Add a fallback model config for an agent
   */
  async addFallbackModel(agentId: string, provider: string, model: string) {
    const config = await db.agentModelConfig.create({
      data: {
        agentId,
        provider,
        model,
        preferenceType: 'fallback',
        enabled: true,
      },
    });

    await eventBus.emit(EventTypes.AGENT_MODEL_CONFIG_UPDATED, {
      agentId,
      configId: config.id,
      provider,
      model,
      preferenceType: 'fallback',
      enabled: config.enabled,
      timestamp: Date.now(),
      source: 'agent-model-config-service',
    });

    return config;
  }

  /**
   * Disable a model config by ID
   */
  async disableModel(agentId: string, configId: string) {
    const config = await db.agentModelConfig.update({
      where: { id: configId },
      data: { enabled: false },
    });

    await eventBus.emit(EventTypes.AGENT_MODEL_CONFIG_UPDATED, {
      agentId,
      configId: config.id,
      provider: config.provider,
      model: config.model,
      preferenceType: config.preferenceType,
      enabled: false,
      timestamp: Date.now(),
      source: 'agent-model-config-service',
    });

    return config;
  }

  /**
   * Deterministic model resolution for an agent.
   * Returns preferred if enabled, else first enabled fallback, else null.
   */
  async resolveModelForAgent(agentId: string, _taskContext?: Record<string, unknown>) {
    const configs = await db.agentModelConfig.findMany({
      where: { agentId, enabled: true },
      orderBy: { preferenceType: 'desc' }, // 'preferred' > 'fallback' alphabetically desc puts preferred first
    });

    // Try preferred first
    const preferred = configs.find((c) => c.preferenceType === 'preferred');
    if (preferred && preferred.enabled) {
      return {
        provider: preferred.provider,
        model: preferred.model,
        preferenceType: preferred.preferenceType,
        maxCostPerTask: preferred.maxCostPerTask,
        maxTokens: preferred.maxTokens,
      };
    }

    // Try fallback
    const fallback = configs.find((c) => c.preferenceType === 'fallback');
    if (fallback && fallback.enabled) {
      return {
        provider: fallback.provider,
        model: fallback.model,
        preferenceType: fallback.preferenceType,
        maxCostPerTask: fallback.maxCostPerTask,
        maxTokens: fallback.maxTokens,
      };
    }

    return null;
  }

  /**
   * Seed default model configs for an agent based on its role
   */
  async seedDefaultModels(agentId: string, role: string): Promise<{ created: number; skipped: number }> {
    const roleModels = DEFAULT_MODELS[role] ?? DEFAULT_MODELS._default;

    // Check if any model configs already exist
    const existing = await db.agentModelConfig.findMany({
      where: { agentId },
    });

    if (existing.length > 0) {
      return { created: 0, skipped: existing.length };
    }

    // Create preferred model
    await db.agentModelConfig.create({
      data: {
        agentId,
        provider: roleModels.preferred.provider,
        model: roleModels.preferred.model,
        preferenceType: 'preferred',
        enabled: true,
      },
    });

    // Create fallback model
    await db.agentModelConfig.create({
      data: {
        agentId,
        provider: roleModels.fallback.provider,
        model: roleModels.fallback.model,
        preferenceType: 'fallback',
        enabled: true,
      },
    });

    return { created: 2, skipped: 0 };
  }

  /**
   * Ensure all permanent agents in workspace have default model configs
   */
  async ensureDefaultModels(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const agents = await db.agent.findMany({
      where: {
        workspaceId,
        type: 'permanent',
      },
    });

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const agent of agents) {
      const result = await this.seedDefaultModels(agent.id, agent.role);
      totalCreated += result.created;
      totalSkipped += result.skipped;
    }

    return { created: totalCreated, skipped: totalSkipped };
  }

  /**
   * Get default models for a role
   */
  getDefaultModels(role: string): RoleModels {
    return DEFAULT_MODELS[role] ?? DEFAULT_MODELS._default;
  }
}

export const agentModelConfigService = AgentModelConfigService.getInstance();
