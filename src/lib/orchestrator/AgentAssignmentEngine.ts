// ─── Agent OS — Agent Assignment Engine ──────────────────────
// Assigns tasks to agents based on keyword-to-role matching.
// Future: replace with semantic similarity or AI-based matching.

import { db } from '../db';
import type { AgentAssignment } from './types';

// ─── Keyword → Role mapping ─────────────────────────────────

interface RoleKeywordMap {
  role: string;
  keywords: string[];
  priority: number; // higher = preferred when multiple match
}

const ROLE_KEYWORDS: RoleKeywordMap[] = [
  {
    role: 'frontend_engineer',
    keywords: [
      'frontend', 'front-end', 'ui', 'page', 'component', 'react', 'next.js',
      'css', 'tailwind', 'styled', 'layout', 'button', 'form', 'modal',
      'dialog', 'navigation', 'sidebar', 'menu', 'responsive', 'animation',
      'hover', 'click', 'input', 'table', 'chart', 'dashboard ui',
    ],
    priority: 10,
  },
  {
    role: 'designer',
    keywords: [
      'design', 'mockup', 'wireframe', 'figma', 'prototype', 'color',
      'typography', 'spacing', 'user experience', 'ux', 'accessibility',
      'icon', 'logo', 'brand', 'visual', 'theme', 'dark mode', 'layout',
    ],
    priority: 9,
  },
  {
    role: 'backend_engineer',
    keywords: [
      'backend', 'back-end', 'api', 'server', 'endpoint', 'rest', 'graphql',
      'route', 'controller', 'middleware', 'authentication', 'auth',
      'session', 'token', 'jwt', 'webhook', 'cron', 'queue', 'worker',
      'validation', 'business logic', 'service',
    ],
    priority: 10,
  },
  {
    role: 'data_engineer',
    keywords: [
      'database', 'db', 'schema', 'prisma', 'sql', 'migration', 'query',
      'index', 'table', 'model', 'orm', 'postgres', 'mysql', 'mongodb',
      'redis', 'cache', 'seed', 'data pipeline', 'etl', 'backup',
    ],
    priority: 10,
  },
  {
    role: 'qa_engineer',
    keywords: [
      'test', 'testing', 'qa', 'bug', 'regression', 'unit test', 'e2e',
      'integration test', 'coverage', 'assertion', 'mock', 'fixture',
      'ci', 'quality', 'validation', 'verification',
    ],
    priority: 10,
  },
  {
    role: 'devops_engineer',
    keywords: [
      'deploy', 'deployment', 'vercel', 'docker', 'container', 'kubernetes',
      'ci/cd', 'pipeline', 'github actions', 'server', 'infrastructure',
      'monitoring', 'logging', 'ssl', 'domain', 'dns', 'cdn', 'nginx',
      'caddy', 'production', 'staging', 'environment',
    ],
    priority: 10,
  },
  {
    role: 'researcher',
    keywords: [
      'research', 'docs', 'documentation', 'find', 'investigate',
      'compare', 'evaluate', 'benchmark', 'best practice', 'tutorial',
      'guide', 'reference', 'rag', 'vector', 'embedding', 'search',
      'ocr', 'pdf', 'document', 'translation', 'nlp', 'ai model',
      'llm', 'language model',
    ],
    priority: 8,
  },
  {
    role: 'architect',
    keywords: [
      'architecture', 'system', 'design pattern', 'microservice',
      'monorepo', 'scalability', 'performance', 'refactor', 'restructure',
      'migration plan', 'technical debt', 'dependency', 'module',
      'abstraction', 'interface', 'contract',
    ],
    priority: 9,
  },
  {
    role: 'analyst',
    keywords: [
      'requirement', 'specification', 'user story', 'acceptance criteria',
      'business', 'stakeholder', 'workflow', 'process', 'feature request',
      'roadmap', 'priority', 'scope',
    ],
    priority: 8,
  },
  {
    role: 'orchestrator',
    keywords: [
      'coordinate', 'orchestrate', 'manage', 'plan', 'strategy',
      'project', 'timeline', 'milestone', 'sprint',
    ],
    priority: 7,
  },
];

class AgentAssignmentEngine {
  private static instance: AgentAssignmentEngine | null = null;

  private constructor() {}

  static getInstance(): AgentAssignmentEngine {
    if (!AgentAssignmentEngine.instance) {
      AgentAssignmentEngine.instance = new AgentAssignmentEngine();
    }
    return AgentAssignmentEngine.instance;
  }

  /**
   * Find the best agent assignment for a task description
   */
  async findAssignment(
    taskTitle: string,
    taskDescription: string,
    workspaceId: string
  ): Promise<AgentAssignment> {
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();

    // Score each role by keyword matches
    const scored = ROLE_KEYWORDS.map((mapping) => {
      const matchedKeywords = mapping.keywords.filter((kw) =>
        text.includes(kw.toLowerCase())
      );
      const score = matchedKeywords.length * mapping.priority;
      return {
        role: mapping.role,
        score,
        matchedKeywords,
        priority: mapping.priority,
      };
    }).filter((s) => s.score > 0);

    // Sort by score descending, then by priority descending
    scored.sort((a, b) => b.score - a.score || b.priority - a.priority);

    // Get the best match
    const bestMatch = scored[0];

    if (!bestMatch) {
      // No keyword match — assign to orchestrator as default
      const orchestrator = await this.findAgentInWorkspace('orchestrator', workspaceId);
      return {
        agentRole: 'orchestrator',
        agentId: orchestrator?.id,
        agentName: orchestrator?.name,
        confidence: 0.3,
        reason: 'No specific keyword match found — defaulting to Orchestrator for triage',
        isTemporary: false,
      };
    }

    // Try to find a permanent agent with this role in the workspace
    const agent = await this.findAgentInWorkspace(bestMatch.role, workspaceId);

    const confidence = Math.min(bestMatch.score / 30, 1.0);
    const isTemporary = !agent;

    return {
      agentRole: bestMatch.role,
      agentId: agent?.id,
      agentName: agent?.name,
      confidence,
      reason: isTemporary
        ? `Matched role "${bestMatch.role}" by keywords: ${bestMatch.matchedKeywords.join(', ')}. No permanent agent found — recommend creating a temporary specialist.`
        : `Matched to ${agent!.name} by keywords: ${bestMatch.matchedKeywords.join(', ')}`,
      isTemporary,
    };
  }

  /**
   * Find all suitable agents for a task (returns ranked list)
   */
  async findAllAssignments(
    taskTitle: string,
    taskDescription: string,
    workspaceId: string
  ): Promise<AgentAssignment[]> {
    const text = `${taskTitle} ${taskDescription}`.toLowerCase();

    const scored = ROLE_KEYWORDS.map((mapping) => {
      const matchedKeywords = mapping.keywords.filter((kw) =>
        text.includes(kw.toLowerCase())
      );
      const score = matchedKeywords.length * mapping.priority;
      return { role: mapping.role, score, matchedKeywords };
    }).filter((s) => s.score > 0);

    scored.sort((a, b) => b.score - a.score);

    const assignments: AgentAssignment[] = [];
    for (const match of scored.slice(0, 3)) {
      const agent = await this.findAgentInWorkspace(match.role, workspaceId);
      const confidence = Math.min(match.score / 30, 1.0);
      assignments.push({
        agentRole: match.role,
        agentId: agent?.id,
        agentName: agent?.name,
        confidence,
        reason: `Matched by keywords: ${match.matchedKeywords.join(', ')}`,
        isTemporary: !agent,
      });
    }

    return assignments;
  }

  /**
   * Find an agent by role in a workspace
   */
  private async findAgentInWorkspace(role: string, workspaceId: string) {
    return db.agent.findFirst({
      where: { role, workspaceId, type: 'permanent' },
    });
  }

  /**
   * Get all available role keywords (for debugging/display)
   */
  getRoleKeywords(): RoleKeywordMap[] {
    return [...ROLE_KEYWORDS];
  }
}

export const agentAssignmentEngine = AgentAssignmentEngine.getInstance();
