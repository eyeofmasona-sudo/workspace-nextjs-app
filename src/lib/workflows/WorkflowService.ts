// ─── Agent OS — Workflow Template Service ─────────────────────
// Manages workflow templates: listing, creating, executing,
// and seeding default templates for common multi-agent workflows.

import { db } from '../db';

// ─── Types ──────────────────────────────────────────────────

export interface WorkflowStep {
  stepNumber: number;
  agentRole: string;
  skillKey: string;
  toolKey: string;
  description: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  category?: string;
  icon?: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowTemplateWithSteps {
  id: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  category: string | null;
  icon: string | null;
  version: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionResult {
  templateId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  input: Record<string, unknown>;
  startedAt: Date;
}

// ─── Default Workflow Definitions ────────────────────────────

const DEFAULT_WORKFLOWS: CreateWorkflowInput[] = [
  {
    name: 'Feature Development',
    description:
      'End-to-end feature development workflow: Architect designs the solution, Frontend/Backend engineers implement it, QA validates the result.',
    category: 'development',
    icon: '🚀',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'architect',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Design the feature architecture and create implementation plan',
      },
      {
        stepNumber: 2,
        agentRole: 'frontend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Implement frontend components and user interface',
      },
      {
        stepNumber: 3,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'http_request',
        description: 'Implement backend API endpoints and business logic',
      },
      {
        stepNumber: 4,
        agentRole: 'qa_engineer',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Write and execute tests, validate the feature meets requirements',
      },
    ],
  },
  {
    name: 'Bug Investigation',
    description:
      'Systematic bug investigation: Analyst reproduces and analyzes the bug, Developer implements a fix, QA verifies the fix.',
    category: 'development',
    icon: '🐛',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'analyst',
        skillKey: 'planning',
        toolKey: 'http_request',
        description: 'Reproduce the bug, analyze root cause, and document findings',
      },
      {
        stepNumber: 2,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Implement the bug fix based on analysis findings',
      },
      {
        stepNumber: 3,
        agentRole: 'qa_engineer',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Verify the fix resolves the bug without regressions',
      },
    ],
  },
  {
    name: 'Research Report',
    description:
      'Research and report generation: Researcher gathers information, Analyst synthesizes findings, Designer formats the final report.',
    category: 'research',
    icon: '📊',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'researcher',
        skillKey: 'summarization',
        toolKey: 'http_request',
        description: 'Conduct research and gather relevant information from sources',
      },
      {
        stepNumber: 2,
        agentRole: 'analyst',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Analyze findings, identify patterns, and synthesize key insights',
      },
      {
        stepNumber: 3,
        agentRole: 'designer',
        skillKey: 'summarization',
        toolKey: 'file_reader',
        description: 'Format and design the final research report with visual elements',
      },
    ],
  },
  {
    name: 'Code Review',
    description:
      'Structured code review: Developer reviews code changes, Security Engineer checks for vulnerabilities, QA validates test coverage.',
    category: 'review',
    icon: '🔍',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Review code changes for correctness, style, and best practices',
      },
      {
        stepNumber: 2,
        agentRole: 'security_engineer',
        skillKey: 'validation',
        toolKey: 'http_request',
        description: 'Analyze code for security vulnerabilities and compliance issues',
      },
      {
        stepNumber: 3,
        agentRole: 'qa_engineer',
        skillKey: 'planning',
        toolKey: 'calculator',
        description: 'Verify test coverage and validate test quality',
      },
    ],
  },
  {
    name: 'Deployment Pipeline',
    description:
      'Production deployment workflow: Developer prepares the release, DevOps Engineer handles infrastructure deployment, Security Engineer performs final checks.',
    category: 'deployment',
    icon: '🚢',
    steps: [
      {
        stepNumber: 1,
        agentRole: 'backend_engineer',
        skillKey: 'validation',
        toolKey: 'file_reader',
        description: 'Prepare release artifacts and verify build integrity',
      },
      {
        stepNumber: 2,
        agentRole: 'devops_engineer',
        skillKey: 'planning',
        toolKey: 'http_request',
        description: 'Deploy to staging, run smoke tests, and promote to production',
      },
      {
        stepNumber: 3,
        agentRole: 'security_engineer',
        skillKey: 'validation',
        toolKey: 'http_request',
        description: 'Perform post-deployment security validation and monitoring setup',
      },
    ],
  },
];

// ─── WorkflowService ──────────────────────────────────────

class WorkflowService {
  private static instance: WorkflowService | null = null;

  private constructor() {}

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  // ─── List Templates ──────────────────────────────────

  /**
   * List workflow templates, optionally filtered by category.
   */
  async listTemplates(category?: string): Promise<WorkflowTemplateWithSteps[]> {
    const where = category ? { category } : {};

    const templates = await db.workflowTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => this.parseTemplate(t));
  }

  // ─── Get Template ──────────────────────────────────

  /**
   * Get a single workflow template by ID with parsed steps.
   */
  async getTemplate(id: string): Promise<WorkflowTemplateWithSteps | null> {
    const template = await db.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) return null;
    return this.parseTemplate(template);
  }

  // ─── Create Template ──────────────────────────────────

  /**
   * Create a new workflow template from the given input data.
   */
  async createTemplate(data: CreateWorkflowInput): Promise<WorkflowTemplateWithSteps> {
    const template = await db.workflowTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        steps: JSON.stringify(data.steps),
        category: data.category ?? null,
        icon: data.icon ?? null,
        version: data.version ?? '1.0.0',
        status: 'available',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    return this.parseTemplate(template);
  }

  // ─── Execute Template ────────────────────────────────────────

  /**
   * Workflow execution — NOT YET IMPLEMENTED.
   * Throws a NotImplementedError so callers receive an unambiguous failure,
   * not a fabricated {status:'pending'} that agents might treat as success.
   *
   * Option B (real execution via OrchestratorEngine) will replace this
   * when the scope is confirmed.
   */
  async executeTemplate(
    templateId: string,
    _input: Record<string, unknown>
  ): Promise<never> {
    // Verify template exists first so the error message is informative
    const template = await db.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Workflow template not found: ${templateId}`);
    }

    throw new Error(
      `Workflow execution is not yet implemented (template: "${template.name}"). ` +
      `Use the orchestrator chat API to run agents manually.`
    );
  }

  // ─── Seed Default Templates ──────────────────────────────────

  /**
   * Seed 5 default workflow templates if they don't already exist.
   * Uses the template name as a uniqueness check to avoid duplicates.
   */
  async seedDefaults(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const workflow of DEFAULT_WORKFLOWS) {
      // Check if a template with this name already exists
      const existing = await db.workflowTemplate.findFirst({
        where: { name: workflow.name },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.workflowTemplate.create({
        data: {
          name: workflow.name,
          description: workflow.description ?? null,
          steps: JSON.stringify(workflow.steps),
          category: workflow.category ?? null,
          icon: workflow.icon ?? null,
          version: workflow.version ?? '1.0.0',
          status: 'available',
          metadata: workflow.metadata ? JSON.stringify(workflow.metadata) : null,
        },
      });

      created++;
    }

    return { created, skipped };
  }

  // ─── Private Helpers ──────────────────────────────────

  /**
   * Parse a raw database template record into a typed object with parsed steps.
   */
  private parseTemplate(raw: {
    id: string;
    name: string;
    description: string | null;
    steps: string;
    category: string | null;
    icon: string | null;
    version: string;
    status: string;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowTemplateWithSteps {
    let parsedSteps: WorkflowStep[];
    try {
      parsedSteps = JSON.parse(raw.steps) as WorkflowStep[];
    } catch {
      parsedSteps = [];
    }

    let parsedMetadata: Record<string, unknown> | null = null;
    if (raw.metadata) {
      try {
        parsedMetadata = JSON.parse(raw.metadata) as Record<string, unknown>;
      } catch {
        parsedMetadata = null;
      }
    }

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      steps: parsedSteps,
      category: raw.category,
      icon: raw.icon,
      version: raw.version,
      status: raw.status,
      metadata: parsedMetadata,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

// Export singleton instance
export const workflowService = WorkflowService.getInstance();
