// ─── Marketing Department — Internal Types ───────────────────
// Types specific to the Marketing Department bounded context.
// These are NOT shared with the Dev Department.

import type { HandoffArtifact, HandoffContract } from '../types/departments';

// ─── Marketing Workflow States ───────────────────────────────

export type MarketingWorkflowState =
  | 'idle'                    // No active marketing work
  | 'awaiting_handoff'        // Waiting for Dev Department artifacts
  | 'researching'             // Market Research & ICP in progress
  | 'messaging'               // Content Strategy in progress
  | 'planning_launch'         // Growth & Distribution planning
  | 'executing_campaign'      // Campaigns are live
  | 'measuring'               // Analytics & Feedback collection
  | 'feedback_loop'           // Sending feedback back to Dev
  | 'post_launch_review';     // Post-launch analysis complete

// ─── Marketing Agent Capabilities ────────────────────────────

export interface MarketingAgentCapability {
  agentId: string;
  role: string;
  capabilities: string[];
  memoryScope: string[];
  toolPermissions: string[];
  successMetrics: string[];
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  condition: string;
  escalateTo: string; // agent ID
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ─── Marketing Campaign ──────────────────────────────────────

export interface MarketingCampaign {
  id: string;
  projectId: string;
  name: string;
  type: 'launch' | 'awareness' | 'acquisition' | 'retention' | 'expansion';
  status: 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
  channels: CampaignChannel[];
  targetMetrics: Record<string, number>;
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdAt: number;
  updatedAt: number;
}

export type CampaignChannel =
  | 'seo'
  | 'paid_search'
  | 'social_organic'
  | 'social_paid'
  | 'email'
  | 'content'
  | 'community'
  | 'partnerships'
  | 'pr'
  | 'product_hunt'
  | 'referral';

// ─── Market Intelligence ─────────────────────────────────────

export interface MarketIntelligence {
  id: string;
  projectId: string;
  type: 'competitor_analysis' | 'market_sizing' | 'icp_profile' | 'jtbd_framework' | 'differentiation_map';
  title: string;
  summary: string;
  data: Record<string, unknown>;
  confidenceLevel: number; // 0-1
  sources: string[];
  createdAt: number;
  updatedAt: number;
}

// ─── Content Asset ───────────────────────────────────────────

export interface ContentAsset {
  id: string;
  projectId: string;
  type: 'landing_page' | 'blog_post' | 'email_sequence' | 'social_post' | 'press_release' | 'ad_copy' | 'video_script' | 'one_pager';
  title: string;
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
  channel: CampaignChannel;
  messagingFramework?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Feedback Report ─────────────────────────────────────────

export interface FeedbackReport {
  id: string;
  projectId: string;
  type: 'market_feedback' | 'campaign_results' | 'kpi_dashboard' | 'trend_analysis';
  summary: string;
  findings: FeedbackFinding[];
  recommendations: string[];
  priorityItems: string[];  // Items that need Dev Department attention
  createdAt: number;
}

export interface FeedbackFinding {
  metric: string;
  currentValue: number;
  targetValue?: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  source: string;
}

// ─── Handoff State Tracking ──────────────────────────────────

export interface HandoffState {
  contractId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  receivedArtifacts: HandoffArtifact[];
  producedArtifacts: HandoffArtifact[];
  receivingAgentId: string;
  startedAt?: number;
  completedAt?: number;
  errors: string[];
}
