// ─── Agent OS — Zod Validation Schemas ───────────────────────

import { z } from 'zod';

// ─── Orchestrator Schemas ────────────────────────────────────

export const orchestratorMessageSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  projectId: z.string().optional(),
  message: z.string().min(1, 'message is required').max(5000, 'message is too long (max 5000 characters)'),
  mode: z.enum(['manual', 'balanced', 'autonomous']).default('balanced'),
});

export const orchestratorPlanSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  projectId: z.string().optional(),
  message: z.string().min(1, 'message is required').max(5000, 'message is too long'),
});

export const planEpicSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tasks: z.array(z.lazy(() => planTaskSchema)),
});

export const planTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedAgentRole: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  requiresApproval: z.boolean().default(false),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    assignedAgentRole: z.string().optional(),
  })).optional(),
});

export const approvePlanSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  projectId: z.string().optional(),
  plan: z.object({
    goal: z.string().min(1),
    assumptions: z.array(z.string()),
    involvedAgentRoles: z.array(z.string()),
    epics: z.array(planEpicSchema),
    risks: z.array(z.string()),
    requiredApprovals: z.array(z.string()),
    estimatedCost: z.object({
      level: z.enum(['low', 'medium', 'high', 'potentially_high']),
      estimatedTokens: z.number().optional(),
      estimatedUsd: z.number().optional(),
      notes: z.array(z.string()),
    }),
    executionMode: z.enum(['sequential', 'parallel', 'mixed']),
    taskSize: z.enum(['small', 'medium', 'large', 'epic']),
  }),
  createProject: z.boolean().optional(),
  projectName: z.string().optional(),
});

// ─── Existing Entity Schemas (for future use) ────────────────

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  name: z.string().min(1, 'name is required').max(200),
  description: z.string().max(2000).optional(),
  sourceType: z.enum(['local', 'git', 'cloud']).default('local'),
  sourcePath: z.string().optional(),
  repoUrl: z.string().optional(),
});

export const createTaskSchema = z.object({
  epicId: z.string().min(1, 'epicId is required'),
  parentTaskId: z.string().optional(),
  title: z.string().min(1, 'title is required').max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedAgentId: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  requiresApproval: z.boolean().default(false),
  costEstimate: z.number().positive().optional(),
});

export const createAgentSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  name: z.string().min(1, 'name is required').max(100),
  role: z.string().min(1, 'role is required').max(100),
  type: z.enum(['permanent', 'temporary']).default('temporary'),
  systemPrompt: z.string().max(10000).optional(),
  locationZone: z.enum([
    'command_area', 'situation_room', 'development_area', 'design_area',
    'research_area', 'server_room', 'meeting_room', 'lounge_area',
  ]).default('lounge_area'),
  visualProfile: z.object({
    color: z.string(),
    icon: z.string(),
    avatarEmoji: z.string(),
  }).optional(),
  professionalStyle: z.object({
    communicationStyle: z.string(),
    decisionMaking: z.string(),
    attentionToDetail: z.string(),
    collaborationStyle: z.string(),
  }).optional(),
});

export const createMemorySchema = z.object({
  scope: z.enum(['global', 'workspace', 'project', 'agent', 'task']),
  scopeId: z.string().optional(),
  type: z.enum(['context', 'decision', 'fact', 'lesson', 'conversation_summary', 'error']),
  content: z.string().min(1, 'content is required').max(10000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createApprovalSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  agentId: z.string().min(1, 'agentId is required'),
  actionType: z.enum(['execute', 'deploy', 'delete', 'modify', 'spend', 'access']),
  summary: z.string().min(1, 'summary is required').max(1000),
  risk: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// ─── Type Inference Helpers ──────────────────────────────────

export type OrchestratorMessageInput = z.infer<typeof orchestratorMessageSchema>;
export type OrchestratorPlanInput = z.infer<typeof orchestratorPlanSchema>;
export type ApprovePlanInput = z.infer<typeof approvePlanSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
