// ─── Agent OS — Orchestrator Chat Engine ──────────────────────
// The real delegation engine for the orchestrator.
//
// Unlike OrchestratorEngine (which creates DB records but never delegates),
// OrchestratorChatEngine ACTUALLY delegates work to agents via agentRuntime.
//
// Flow:
// 1. User sends message to orchestrator
// 2. AI analyzes the message against available agents
// 3. Determines which agents should handle which subtasks
// 4. Executes each agent via agentRuntime.execute()
// 5. Collects results from all agents
// 6. AI synthesizes a unified response
// 7. Returns complete response with delegation details

import { agentRuntime } from '../agent-core/runtime';
import { agentRegistry } from '../agent-core/registry';
import { providerRegistry } from '../ai-provider/provider-registry';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import type { ChatMessage, CompletionRequest } from '../ai-provider/types';
import type { AgentConfig } from '../agent-core/types';
import { generateCorrelationId } from '../utils/correlation';
import { isMarketingAgent, getAgentDepartment, Departments } from '../types/departments';

// ─── Types ───────────────────────────────────────────────────

export interface DelegationStep {
  agentId: string;
  agentName: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'needs_human';
  result?: string;
  error?: string;
  durationMs?: number;
}

export interface OrchestratorChatResponse {
  orchestratorResponse: string;
  delegatedTasks: DelegationStep[];
  totalDurationMs: number;
  modelUsed: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OrchestratorChatInput {
  message: string;
  history?: Array<{ role: string; content: string }>;
  workspaceId?: string;
  mode?: 'auto' | 'manual';
  targetAgentIds?: string[];
  targetDepartment?: 'dev_department' | 'marketing_department';
}

// ─── Internal types for AI delegation analysis ───────────────

interface AgentSummary {
  id: string;
  name: string;
  role: string;
  description: string;
  skills: string[];
  tools: string[];
  department: string;
}

interface DelegationDecision {
  agentId: string;
  task: string;
  reason: string;
}

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
const DELEGATION_ANALYSIS_MODEL = 'anthropic/claude-3.5-sonnet';
const SYNTHESIS_MODEL = 'anthropic/claude-3.5-sonnet';
const MAX_DELEGATION_AGENTS = 5;

// ─── Orchestrator Chat Engine ────────────────────────────────

class OrchestratorChatEngine {
  private static instance: OrchestratorChatEngine | null = null;

  private constructor() {}

  static getInstance(): OrchestratorChatEngine {
    if (!OrchestratorChatEngine.instance) {
      OrchestratorChatEngine.instance = new OrchestratorChatEngine();
    }
    return OrchestratorChatEngine.instance;
  }

  /**
   * Process a user message through the orchestrator chat flow.
   * This is the main entry point for real delegation.
   */
  async chat(input: OrchestratorChatInput): Promise<OrchestratorChatResponse> {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();

    // Emit orchestrator chat started event
    await eventBus.emit(EventTypes.ORCHESTRATOR_MESSAGE_RECEIVED, {
      workspaceId: input.workspaceId ?? 'default',
      message: input.message,
      mode: input.mode ?? 'auto',
      correlationId,
      timestamp: Date.now(),
      source: 'orchestrator-chat-engine',
    }).catch(() => {});

    // Step 1: Check if AI provider is available
    const providerCheck = this.ensureProviderAvailable();
    if (!providerCheck.available) {
      return {
        orchestratorResponse: providerCheck.errorMessage!,
        delegatedTasks: [],
        totalDurationMs: Date.now() - startTime,
        modelUsed: 'none',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    // Step 2: Get available agents (optionally filtered by department)
    let availableAgents = this.getAvailableAgents();
    if (input.targetDepartment) {
      availableAgents = availableAgents.filter(
        (a) => a.department === input.targetDepartment
      );
    }
    if (availableAgents.length === 0) {
      return {
        orchestratorResponse:
          'No agents are currently available to handle your request. Please register agents first.',
        delegatedTasks: [],
        totalDurationMs: Date.now() - startTime,
        modelUsed: 'none',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    // Step 3: Determine delegation plan
    let delegationDecisions: DelegationDecision[];

    if (input.mode === 'manual' && input.targetAgentIds && input.targetAgentIds.length > 0) {
      // Manual mode: user specified which agents to use
      delegationDecisions = this.buildManualDelegations(input.targetAgentIds, input.message, availableAgents);
    } else {
      // Auto mode: AI decides which agents to use
      const analysisResult = await this.analyzeDelegation(input.message, availableAgents, input.history);
      if (!analysisResult.success) {
        return {
          orchestratorResponse: analysisResult.error!,
          delegatedTasks: [],
          totalDurationMs: Date.now() - startTime,
          modelUsed: 'none',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
      }
      delegationDecisions = analysisResult.decisions!;
    }

    if (delegationDecisions.length === 0) {
      // No agents selected — the orchestrator handles it directly
      const directResponse = await this.handleDirectly(input.message, input.history);
      return {
        orchestratorResponse: directResponse.content ?? 'I was unable to process your request.',
        delegatedTasks: [],
        totalDurationMs: Date.now() - startTime,
        modelUsed: directResponse.model,
        usage: directResponse.usage,
      };
    }

    // Step 4: Execute delegated agents (in parallel for efficiency)
    const delegationSteps: DelegationStep[] = delegationDecisions.map((d) => ({
      agentId: d.agentId,
      agentName: availableAgents.find((a) => a.id === d.agentId)?.name ?? d.agentId,
      task: d.task,
      status: 'pending' as const,
    }));

    // Execute all agents in parallel
    const executionPromises = delegationDecisions.map(async (decision, index) => {
      const step = delegationSteps[index];
      step.status = 'running';

      const agentStartTime = Date.now();

      try {
        const result = await agentRuntime.execute(decision.agentId, {
          message: decision.task,
          correlationId,
        });

        // Check if result contains a needs_human indicator from browser_operator
        const resultContent = result.content ?? '';
        const isNeedsHuman = resultContent.includes('"status":"needs_human"') ||
          resultContent.includes('"status": "needs_human"') ||
          resultContent.includes('needs_human');

        if (isNeedsHuman) {
          step.status = 'needs_human';
          step.result = resultContent;
        } else {
          step.status = result.status === 'success' ? 'completed' : 'failed';
          step.result = resultContent;
          step.error = result.error ?? undefined;
        }

        step.durationMs = Date.now() - agentStartTime;

        return result;
      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown execution error';
        step.durationMs = Date.now() - agentStartTime;

        // Attempt fallback: if the agent has a fallback provider, try it
        // This prevents the entire workflow from crashing on a single agent failure
        try {
          const agentConfig = agentRegistry.get(decision.agentId);
          if (agentConfig?.model?.fallback) {
            const fallbackResult = await agentRuntime.execute(decision.agentId, {
              message: decision.task,
              correlationId,
              modelOverride: `${agentConfig.model.fallback.provider}/${agentConfig.model.fallback.model}`,
            });

            if (fallbackResult.status === 'success') {
              step.status = 'completed';
              step.result = fallbackResult.content ?? undefined;
              step.error = undefined;
              step.durationMs = Date.now() - agentStartTime;
              return fallbackResult;
            }
          }
        } catch {
          // Fallback also failed — keep the original error
        }

        return null;
      }
    });

    // Wait for all agent executions to complete
    const executionResults = await Promise.all(executionPromises);

    // Step 5: Synthesize a unified response using AI
    const successfulResults = executionResults.filter(
      (r) => r !== null && r.status === 'success'
    );

    const synthesisResult = await this.synthesizeResponse(
      input.message,
      delegationSteps,
      successfulResults.map((r) => r!),
      input.history
    );

    const totalDurationMs = Date.now() - startTime;

    // Emit completion event
    await eventBus.emit(EventTypes.ORCHESTRATOR_PLAN_APPROVED, {
      workspaceId: input.workspaceId ?? 'default',
      planGoal: input.message,
      createdEpicCount: 1,
      createdTaskCount: delegationSteps.length,
      createdApprovalCount: 0,
      timestamp: Date.now(),
      source: 'orchestrator-chat-engine',
    }).catch(() => {});

    return {
      orchestratorResponse: synthesisResult.content,
      delegatedTasks: delegationSteps,
      totalDurationMs,
      modelUsed: synthesisResult.model,
      usage: synthesisResult.usage,
    };
  }

  // ── AI Delegation Analysis ────────────────────────────────

  /**
   * Use AI to analyze which agents should handle the user's message.
   * Returns a list of delegation decisions.
   */
  private async analyzeDelegation(
    message: string,
    availableAgents: AgentSummary[],
    history?: Array<{ role: string; content: string }>
  ): Promise<{ success: boolean; decisions?: DelegationDecision[]; error?: string }> {
    try {
      const provider = providerRegistry.getOrThrow('openrouter');

      // Build the agent catalog for the prompt
      const agentCatalog = availableAgents
        .map(
          (a) =>
            `- ID: "${a.id}" | Name: "${a.name}" | Role: ${a.role} | Department: ${a.department} | Description: ${a.description}` +
            (a.skills.length > 0 ? ` | Skills: ${a.skills.join(', ')}` : '') +
            (a.tools.length > 0 ? ` | Tools: ${a.tools.join(', ')}` : '')
        )
        .join('\n');

      const systemPrompt = `You are the Agent OS Orchestrator. Your job is to analyze user requests and determine which specialized agents should handle the work.

AVAILABLE AGENTS:
${agentCatalog}

RULES:
1. Select ONLY agents that are relevant to the user's request
2. Each selected agent gets a specific subtask (not the entire request)
3. Maximum ${MAX_DELEGATION_AGENTS} agents can be delegated to
4. If no agent is relevant, return an empty list (the orchestrator will handle it directly)
5. Be precise with subtask descriptions — each agent should know exactly what to do
6. Consider department boundaries — dev agents handle product/technical tasks, marketing agents handle promotion/content/growth tasks
7. For marketing-related tasks (launch, positioning, content, growth, campaigns), prefer marketing department agents
8. For technical tasks (code, architecture, testing, deployment), prefer dev department agents
9. Cross-department collaboration should go through the orchestrator — don't assign marketing tasks to dev agents or vice versa

RESPOND WITH JSON ONLY. No markdown, no explanation outside JSON.
Format:
{
  "delegations": [
    {
      "agentId": "the-agent-id",
      "task": "specific task description for this agent",
      "reason": "why this agent was selected"
    }
  ]
}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history for context
      if (history && history.length > 0) {
        for (const h of history.slice(-6)) {
          messages.push({ role: h.role as ChatMessage['role'], content: h.content });
        }
      }

      messages.push({ role: 'user', content: message });

      const request: CompletionRequest = {
        model: DELEGATION_ANALYSIS_MODEL,
        messages,
        temperature: 0.3,
        maxTokens: 1024,
      };

      const response = await provider.complete(request);

      if (!response.content) {
        return {
          success: false,
          error: 'AI delegation analysis returned no content. Please try again.',
        };
      }

      // Parse the JSON response
      const decisions = this.parseDelegationResponse(response.content, availableAgents);

      return { success: true, decisions };
    } catch (error) {
      console.error('[OrchestratorChatEngine] Delegation analysis failed:', error);
      return {
        success: false,
        error: `Failed to analyze delegation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Parse the AI's delegation response into structured decisions.
   * Handles various formats the model might return.
   */
  private parseDelegationResponse(
    content: string,
    availableAgents: AgentSummary[]
  ): DelegationDecision[] {
    try {
      // Try to extract JSON from the response
      // The model might wrap it in markdown code blocks
      let jsonStr = content.trim();

      // Remove markdown code fences if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Try to find the JSON object
      const braceStart = jsonStr.indexOf('{');
      const braceEnd = jsonStr.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd !== -1) {
        jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
      }

      const parsed = JSON.parse(jsonStr);

      if (!parsed.delegations || !Array.isArray(parsed.delegations)) {
        console.warn('[OrchestratorChatEngine] AI response missing delegations array');
        return [];
      }

      const validAgentIds = new Set(availableAgents.map((a) => a.id));

      return parsed.delegations
        .filter((d: Record<string, unknown>) => {
          if (!d.agentId || typeof d.agentId !== 'string') return false;
          if (!validAgentIds.has(d.agentId)) {
            console.warn(
              `[OrchestratorChatEngine] AI suggested unknown agent: ${d.agentId}, skipping`
            );
            return false;
          }
          return true;
        })
        .slice(0, MAX_DELEGATION_AGENTS)
        .map((d: Record<string, unknown>) => ({
          agentId: d.agentId as string,
          task: (d.task as string) || 'Handle the assigned work',
          reason: (d.reason as string) || '',
        }));
    } catch (parseError) {
      console.error('[OrchestratorChatEngine] Failed to parse delegation response:', parseError);
      console.error('[OrchestratorChatEngine] Raw content:', content.slice(0, 500));
      return [];
    }
  }

  // ── Manual Delegation ─────────────────────────────────────

  /**
   * Build delegation decisions for manual mode where the user specifies agents.
   */
  private buildManualDelegations(
    targetAgentIds: string[],
    message: string,
    availableAgents: AgentSummary[]
  ): DelegationDecision[] {
    const validIds = new Set(availableAgents.map((a) => a.id));

    return targetAgentIds
      .filter((id) => validIds.has(id))
      .slice(0, MAX_DELEGATION_AGENTS)
      .map((agentId) => {
        const agent = availableAgents.find((a) => a.id === agentId);
        return {
          agentId,
          task: message,
          reason: `User explicitly requested agent: ${agent?.name ?? agentId}`,
        };
      });
  }

  // ── Direct Handling (no agent delegation) ─────────────────

  /**
   * Handle a message directly when no agents are suitable.
   * Uses AI to generate a response without delegation.
   */
  private async handleDirectly(
    message: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<{ content: string; model: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    try {
      const provider = providerRegistry.getOrThrow('openrouter');

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content:
            'You are the Agent OS Orchestrator. No specialized agents are available for this task, so you are handling it directly. Provide a helpful, concise response. If the task requires specialized capabilities, suggest which type of agent would be needed.',
        },
      ];

      if (history && history.length > 0) {
        for (const h of history.slice(-6)) {
          messages.push({ role: h.role as ChatMessage['role'], content: h.content });
        }
      }

      messages.push({ role: 'user', content: message });

      const response = await provider.complete({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        maxTokens: 2048,
      });

      return {
        content: response.content ?? 'No response generated.',
        model: response.model,
        usage: response.usage,
      };
    } catch (error) {
      return {
        content: `I was unable to process your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model: 'none',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  // ── Response Synthesis ────────────────────────────────────

  /**
   * Synthesize a unified response from all agent results.
   * Uses AI to create a coherent, user-facing answer.
   */
  private async synthesizeResponse(
    originalMessage: string,
    delegationSteps: DelegationStep[],
    agentResults: Array<{ agentId: string; content: string | null; model: string; durationMs: number }>,
    history?: Array<{ role: string; content: string }>
  ): Promise<{ content: string; model: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    try {
      const provider = providerRegistry.getOrThrow('openrouter');

      // Build a summary of what each agent contributed
      const agentSummaries = delegationSteps
        .map((step) => {
          const result = agentResults.find((r) => r.agentId === step.agentId);
          const statusIcon = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : step.status === 'needs_human' ? '🖐️' : '⏳';
          return (
            `${statusIcon} Agent: ${step.agentName} (${step.agentId})\n` +
            `   Task: ${step.task}\n` +
            `   Status: ${step.status}\n` +
            (step.result ? `   Result: ${step.result.slice(0, 2000)}\n` : '') +
            (step.error ? `   Error: ${step.error}\n` : '') +
            `   Duration: ${step.durationMs ?? 0}ms`
          );
        })
        .join('\n\n');

      const systemPrompt = `You are the Agent OS Orchestrator. You delegated tasks to specialized agents and have received their results. Your job is to synthesize a clear, unified response for the user.

GUIDELINES:
1. Start with a direct answer to the user's original question
2. Reference which agents contributed to the answer
3. If any agents failed, mention it honestly and suggest alternatives
4. If any agents returned needs_human status (🖐️), explain that manual intervention is required (e.g. login, CAPTCHA, 2FA) and the task is paused pending human action. This is NOT a failure — the task will continue after manual intervention via the browser operator resume endpoint.
5. Be concise but comprehensive
6. Don't just concatenate agent outputs — integrate them into a coherent response
7. If the results are technical, provide a summary that's accessible

ORIGINAL USER REQUEST:
${originalMessage}

AGENT RESULTS:
${agentSummaries}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      if (history && history.length > 0) {
        for (const h of history.slice(-4)) {
          messages.push({ role: h.role as ChatMessage['role'], content: h.content });
        }
      }

      messages.push({
        role: 'user',
        content: 'Please provide a unified response based on the agent results above.',
      });

      const response = await provider.complete({
        model: SYNTHESIS_MODEL,
        messages,
        temperature: 0.5,
        maxTokens: 2048,
      });

      return {
        content: response.content ?? 'Unable to synthesize response.',
        model: response.model,
        usage: response.usage,
      };
    } catch (error) {
      console.error('[OrchestratorChatEngine] Synthesis failed:', error);

      // Fallback: build a simple response from the raw results
      const fallbackContent = delegationSteps
        .filter((s) => s.status === 'completed' && s.result)
        .map((s) => `**${s.agentName}**: ${s.result}`)
        .join('\n\n');

      return {
        content:
          fallbackContent ||
          'The orchestrator completed delegation but was unable to synthesize a unified response.',
        model: 'none',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  // ── Helper Methods ────────────────────────────────────────

  /**
   * Check that the AI provider is available and configured.
   */
  private ensureProviderAvailable(): { available: boolean; errorMessage?: string } {
    if (!providerRegistry.has('openrouter')) {
      return {
        available: false,
        errorMessage:
          'The AI provider is not configured. Please set the OPENROUTER_API_KEY environment variable to enable the orchestrator chat engine.',
      };
    }
    return { available: true };
  }

  /**
   * Get a summary of all available agents for delegation analysis.
   */
  private getAvailableAgents(): AgentSummary[] {
    return agentRegistry
      .listAll()
      .filter((config) => config.role !== 'orchestrator') // Don't delegate to self
      .map((config: AgentConfig) => ({
        id: config.id,
        name: config.name,
        role: config.role,
        description: config.description,
        skills: config.skills.filter((s) => s.enabled).map((s) => s.skillId),
        tools: config.tools.filter((t) => t.enabled).map((t) => t.toolId),
        department: getAgentDepartment(config.role),
      }));
  }
}

export const orchestratorChatEngine = OrchestratorChatEngine.getInstance();
