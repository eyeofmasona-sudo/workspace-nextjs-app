// ─── Marketing Department — Registry ─────────────────────────
// Manages the Marketing Department as a bounded context.
// Tracks agents, campaigns, handoff states, and workflow progression.

import type {
  MarketingWorkflowState,
  MarketingCampaign,
  MarketIntelligence,
  ContentAsset,
  FeedbackReport,
  HandoffState,
  MarketingAgentCapability,
} from './types';
import type { HandoffArtifact, HandoffContract, Department } from '../types/departments';
import { Departments, DepartmentAgents, DEV_TO_MARKETING_ARTIFACTS, MARKETING_TO_DEV_ARTIFACTS } from '../types/departments';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';

// ─── Marketing Agent Specifications ──────────────────────────

const MARKETING_AGENT_SPECS: MarketingAgentCapability[] = [
  {
    agentId: 'marketing_lead',
    role: 'marketing_lead',
    capabilities: [
      'marketing_strategy',
      'gtm_planning',
      'positioning',
      'launch_coordination',
      'handoff_management',
      'cross_department_liaison',
    ],
    memoryScope: ['department', 'project', 'workspace'],
    toolPermissions: ['files:read', 'browser:read', 'http:read'],
    successMetrics: [
      'launch_plan_completeness',
      'positioning_clarity_score',
      'handoff_success_rate',
      'time_to_gtm',
    ],
    escalationRules: [
      { condition: 'handoff_artifacts_incomplete', escalateTo: 'orchestrator', severity: 'high' },
      { condition: 'dev_feedback_urgent', escalateTo: 'orchestrator', severity: 'critical' },
    ],
  },
  {
    agentId: 'market_researcher',
    role: 'market_researcher',
    capabilities: [
      'market_research',
      'competitor_analysis',
      'icp_definition',
      'jtbd_framework',
      'market_sizing',
      'differentiation_mapping',
    ],
    memoryScope: ['department', 'project'],
    toolPermissions: ['files:read', 'browser:read', 'http:read'],
    successMetrics: [
      'research_completeness',
      'icp_accuracy',
      'competitor_coverage',
      'confidence_level',
    ],
    escalationRules: [
      { condition: 'insufficient_market_data', escalateTo: 'marketing_lead', severity: 'medium' },
      { condition: 'competitor_threat_critical', escalateTo: 'marketing_lead', severity: 'high' },
    ],
  },
  {
    agentId: 'content_strategist',
    role: 'content_strategist',
    capabilities: [
      'messaging_framework',
      'value_proposition',
      'content_planning',
      'channel_copywriting',
      'brand_voice',
      'funnel_messaging',
    ],
    memoryScope: ['department', 'project'],
    toolPermissions: ['files:read', 'http:read'],
    successMetrics: [
      'message_consistency_score',
      'content_throughput',
      'channel_coverage',
      'copy_effectiveness',
    ],
    escalationRules: [
      { condition: 'messaging_misalignment', escalateTo: 'marketing_lead', severity: 'medium' },
      { condition: 'brand_voice_violation', escalateTo: 'marketing_lead', severity: 'high' },
    ],
  },
  {
    agentId: 'growth_manager',
    role: 'growth_manager',
    capabilities: [
      'launch_execution',
      'channel_management',
      'campaign_planning',
      'seo_optimization',
      'growth_experiments',
      'community_building',
    ],
    memoryScope: ['department', 'project', 'workspace'],
    toolPermissions: ['files:read', 'browser:read', 'http:read', 'terminal:read'],
    successMetrics: [
      'campaign_roi',
      'channel_performance',
      'acquisition_rate',
      'experiment_velocity',
    ],
    escalationRules: [
      { condition: 'campaign_underperforming', escalateTo: 'marketing_lead', severity: 'medium' },
      { condition: 'budget_overrun', escalateTo: 'marketing_lead', severity: 'high' },
    ],
  },
  {
    agentId: 'marketing_analyst',
    role: 'marketing_analyst',
    capabilities: [
      'kpi_tracking',
      'market_signal_collection',
      'campaign_analysis',
      'feedback_reporting',
      'trend_detection',
      'product_feedback',
    ],
    memoryScope: ['department', 'project', 'workspace', 'global'],
    toolPermissions: ['files:read', 'http:read'],
    successMetrics: [
      'kpi_dashboard_completeness',
      'feedback_actionability',
      'signal_accuracy',
      'loop_closure_rate',
    ],
    escalationRules: [
      { condition: 'critical_market_signal', escalateTo: 'marketing_lead', severity: 'high' },
      { condition: 'product_feedback_urgent', escalateTo: 'orchestrator', severity: 'critical' },
    ],
  },
];

// ─── Default Handoff Contracts ───────────────────────────────

const DEFAULT_HANDOFF_CONTRACTS: Omit<HandoffContract, 'id'>[] = [
  {
    fromDepartment: Departments.DEV,
    toDepartment: Departments.MARKETING,
    triggerEvent: EventTypes.PRODUCT_CONCEPT_READY,
    inputArtifacts: DEV_TO_MARKETING_ARTIFACTS,
    outputArtifacts: [
      { type: 'document', name: 'Initial Market Assessment', content: '', format: 'markdown' },
    ],
    receivingAgent: 'marketing_lead',
    completionConditions: ['market_assessment_complete', 'icp_draft_ready'],
  },
  {
    fromDepartment: Departments.DEV,
    toDepartment: Departments.MARKETING,
    triggerEvent: EventTypes.MVP_READY_FOR_MARKETING,
    inputArtifacts: DEV_TO_MARKETING_ARTIFACTS,
    outputArtifacts: [
      { type: 'document', name: 'Positioning Brief', content: '', format: 'markdown' },
      { type: 'document', name: 'ICP / Persona Summary', content: '', format: 'markdown' },
      { type: 'document', name: 'Messaging Framework', content: '', format: 'markdown' },
    ],
    receivingAgent: 'marketing_lead',
    completionConditions: ['positioning_approved', 'icp_validated', 'messaging_aligned'],
  },
  {
    fromDepartment: Departments.DEV,
    toDepartment: Departments.MARKETING,
    triggerEvent: EventTypes.RELEASE_CANDIDATE_READY,
    inputArtifacts: DEV_TO_MARKETING_ARTIFACTS,
    outputArtifacts: [
      { type: 'document', name: 'Launch Plan', content: '', format: 'markdown' },
      { type: 'document', name: 'Channel Strategy', content: '', format: 'markdown' },
      { type: 'document', name: 'Content Backlog', content: '', format: 'markdown' },
    ],
    receivingAgent: 'marketing_lead',
    completionConditions: ['launch_plan_approved', 'channels_configured', 'content_ready'],
  },
  {
    fromDepartment: Departments.MARKETING,
    toDepartment: Departments.DEV,
    triggerEvent: EventTypes.MARKET_FEEDBACK_COLLECTED,
    inputArtifacts: [],
    outputArtifacts: MARKETING_TO_DEV_ARTIFACTS,
    receivingAgent: 'analyst',
    completionConditions: ['feedback_delivered', 'acknowledged_by_dev'],
  },
];

// ─── Marketing Department Registry Singleton ─────────────────

class MarketingDepartmentRegistry {
  private static instance: MarketingDepartmentRegistry | null = null;

  private workflowStates: Map<string, MarketingWorkflowState> = new Map();
  private campaigns: Map<string, MarketingCampaign> = new Map();
  private intelligence: Map<string, MarketIntelligence> = new Map();
  private contentAssets: Map<string, ContentAsset> = new Map();
  private feedbackReports: Map<string, FeedbackReport> = new Map();
  private handoffStates: Map<string, HandoffState> = new Map();
  private agentSpecs: Map<string, MarketingAgentCapability> = new Map();

  private constructor() {
    // Initialize agent specs
    for (const spec of MARKETING_AGENT_SPECS) {
      this.agentSpecs.set(spec.agentId, spec);
    }

    // Initialize handoff contracts
    for (const contract of DEFAULT_HANDOFF_CONTRACTS) {
      const id = `handoff_${contract.triggerEvent}_${contract.toDepartment}`;
      this.handoffStates.set(id, {
        contractId: id,
        status: 'pending',
        receivedArtifacts: [],
        producedArtifacts: [],
        receivingAgentId: contract.receivingAgent,
        errors: [],
      });
    }

    // Subscribe to handoff events
    this.subscribeToHandoffEvents();
  }

  static getInstance(): MarketingDepartmentRegistry {
    if (!MarketingDepartmentRegistry.instance) {
      MarketingDepartmentRegistry.instance = new MarketingDepartmentRegistry();
    }
    return MarketingDepartmentRegistry.instance;
  }

  // ── Workflow State Management ────────────────────────────

  getWorkflowState(projectId: string): MarketingWorkflowState {
    return this.workflowStates.get(projectId) ?? 'idle';
  }

  setWorkflowState(projectId: string, state: MarketingWorkflowState): void {
    this.workflowStates.set(projectId, state);
  }

  // ── Agent Specs ──────────────────────────────────────────

  getAgentSpec(agentId: string): MarketingAgentCapability | undefined {
    return this.agentSpecs.get(agentId);
  }

  getAllAgentSpecs(): MarketingAgentCapability[] {
    return Array.from(this.agentSpecs.values());
  }

  // ── Campaign Management ──────────────────────────────────

  addCampaign(campaign: MarketingCampaign): void {
    this.campaigns.set(campaign.id, campaign);
  }

  getCampaign(campaignId: string): MarketingCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  getCampaignsByProject(projectId: string): MarketingCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => c.projectId === projectId);
  }

  updateCampaignStatus(campaignId: string, status: MarketingCampaign['status']): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;
    campaign.status = status;
    campaign.updatedAt = Date.now();
    return true;
  }

  // ── Market Intelligence ──────────────────────────────────

  addIntelligence(intel: MarketIntelligence): void {
    this.intelligence.set(intel.id, intel);
  }

  getIntelligenceByProject(projectId: string): MarketIntelligence[] {
    return Array.from(this.intelligence.values()).filter(i => i.projectId === projectId);
  }

  // ── Content Assets ───────────────────────────────────────

  addContentAsset(asset: ContentAsset): void {
    this.contentAssets.set(asset.id, asset);
  }

  getContentAssetsByProject(projectId: string): ContentAsset[] {
    return Array.from(this.contentAssets.values()).filter(a => a.projectId === projectId);
  }

  // ── Feedback Reports ─────────────────────────────────────

  addFeedbackReport(report: FeedbackReport): void {
    this.feedbackReports.set(report.id, report);
  }

  getFeedbackReportsByProject(projectId: string): FeedbackReport[] {
    return Array.from(this.feedbackReports.values()).filter(r => r.projectId === projectId);
  }

  // ── Handoff Management ───────────────────────────────────

  getHandoffState(contractId: string): HandoffState | undefined {
    return this.handoffStates.get(contractId);
  }

  getAllHandoffStates(): HandoffState[] {
    return Array.from(this.handoffStates.values());
  }

  updateHandoffState(contractId: string, updates: Partial<HandoffState>): boolean {
    const state = this.handoffStates.get(contractId);
    if (!state) return false;
    Object.assign(state, updates);
    return true;
  }

  // ── Event Subscriptions ──────────────────────────────────

  private subscribeToHandoffEvents(): void {
    // When Dev emits product_concept_ready
    eventBus.on(EventTypes.PRODUCT_CONCEPT_READY, async (payload) => {
      const projectId = payload.projectId;
      this.setWorkflowState(projectId, 'awaiting_handoff');

      const contractId = `handoff_${EventTypes.PRODUCT_CONCEPT_READY}_${Departments.MARKETING}`;
      this.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: [
          { type: 'document', name: 'Product Brief', content: payload.productBrief, format: 'markdown' },
          { type: 'document', name: 'Target User Hypothesis', content: payload.targetUserHypothesis, format: 'markdown' },
        ],
      });

      this.setWorkflowState(projectId, 'researching');
    });

    // When Dev emits mvp_ready_for_marketing
    eventBus.on(EventTypes.MVP_READY_FOR_MARKETING, async (payload) => {
      const projectId = payload.projectId;
      this.setWorkflowState(projectId, 'researching');

      const contractId = `handoff_${EventTypes.MVP_READY_FOR_MARKETING}_${Departments.MARKETING}`;
      this.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: [
          { type: 'document', name: 'PRD', content: payload.prd, format: 'markdown' },
          { type: 'document', name: 'Changelog', content: payload.changelog, format: 'markdown' },
        ],
      });

      this.setWorkflowState(projectId, 'messaging');
    });

    // When Dev emits release_candidate_ready
    eventBus.on(EventTypes.RELEASE_CANDIDATE_READY, async (payload) => {
      const projectId = payload.projectId;
      this.setWorkflowState(projectId, 'planning_launch');

      const contractId = `handoff_${EventTypes.RELEASE_CANDIDATE_READY}_${Departments.MARKETING}`;
      this.updateHandoffState(contractId, {
        status: 'in_progress',
        startedAt: Date.now(),
        receivedArtifacts: [
          { type: 'document', name: 'Release Notes', content: payload.releaseNotes, format: 'markdown' },
        ],
      });
    });

    // When Marketing emits campaign_live
    eventBus.on(EventTypes.CAMPAIGN_LIVE, async (payload) => {
      this.setWorkflowState(payload.projectId, 'executing_campaign');
    });

    // When Marketing emits market_feedback_collected
    eventBus.on(EventTypes.MARKET_FEEDBACK_COLLECTED, async (payload) => {
      this.setWorkflowState(payload.projectId, 'feedback_loop');
    });

    // When post_launch_review is emitted
    eventBus.on(EventTypes.POST_LAUNCH_REVIEW, async (payload) => {
      this.setWorkflowState(payload.projectId, 'post_launch_review');
    });
  }

  // ── Department Info ──────────────────────────────────────

  getDepartmentInfo(): {
    id: Department;
    name: string;
    agentCount: number;
    agents: Array<{ id: string; role: string; capabilities: string[] }>;
    activeWorkflows: number;
    activeCampaigns: number;
    pendingHandoffs: number;
  } {
    const agents = this.getAllAgentSpecs().map(s => ({
      id: s.agentId,
      role: s.role,
      capabilities: s.capabilities,
    }));

    const activeWorkflows = Array.from(this.workflowStates.values())
      .filter(s => s !== 'idle').length;

    const activeCampaigns = Array.from(this.campaigns.values())
      .filter(c => c.status === 'active').length;

    const pendingHandoffs = Array.from(this.handoffStates.values())
      .filter(h => h.status === 'pending' || h.status === 'in_progress').length;

    return {
      id: Departments.MARKETING,
      name: 'Marketing Department',
      agentCount: agents.length,
      agents,
      activeWorkflows,
      activeCampaigns,
      pendingHandoffs,
    };
  }
}

export const marketingDepartmentRegistry = MarketingDepartmentRegistry.getInstance();
