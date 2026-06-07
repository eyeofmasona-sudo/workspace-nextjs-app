// ─── Agent OS — useOfficeData Hook ───────────────────────────
// Fetches and manages the full office state from the API.
// Polls every 5 seconds for real-time updates.

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  type: string;
  status: string;
  locationZone: string;
  activeTaskId: string | null;
  visualProfile: Record<string, unknown> | null;
  professionalStyle: Record<string, unknown> | null;
  workspaceId: string;
  profile: {
    id: string;
    displayName: string;
    avatarKey: string | null;
    bio: string | null;
    seniority: string;
    workingStyle: Record<string, unknown> | null;
    strengths: string[] | null;
    limitations: string[] | null;
    responsibilities: string[] | null;
  } | null;
  runtimeState: {
    id: string;
    status: string;
    locationZone: string;
    activeTaskId: string | null;
    lastActivityAt: string;
    currentActivity: string | null;
    metadata: Record<string, unknown> | null;
  } | null;
  capabilities: Array<{ capabilityKey: string; level: string; enabled: boolean }>;
  permissions: Array<{ permissionKey: string; permissionLevel: string; enabled: boolean }>;
  modelConfigs: Array<{ provider: string; model: string; preferenceType: string; enabled: boolean }>;
}

export interface OfficeTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  riskLevel: string;
  requiresApproval: boolean;
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string; role: string } | null;
  epicId: string;
  parentTaskId: string | null;
  costEstimate: number | null;
  costActual: number | null;
  subtaskCount: number;
  pendingApprovals: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeApproval {
  id: string;
  taskId: string | null;
  workspaceId: string | null;
  agentId: string;
  agent: { id: string; name: string; role: string };
  actionType: string;
  summary: string;
  risk: string;
  payload: Record<string, unknown> | null;
  status: string;
  createdAt: string;
}

export interface OfficeToolExecution {
  id: string;
  workspaceId: string;
  agentId: string | null;
  taskId: string | null;
  toolId: string;
  action: string;
  correlationId: string | null;
  inputSummary: string | null;
  outputSummary: string | null;
  status: string;
  riskLevel: string;
  approvalRequestId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  tool: { id: string; name: string; key: string; category: string };
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface OfficeEvent {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface OfficeSituation {
  activeTasks: number;
  blockedTasks: number;
  approvalsNeeded: number;
  runningTools: number;
  failedExecutions: number;
}

export interface OfficeState {
  workspaceId: string;
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  approvals: OfficeApproval[];
  toolExecutions: OfficeToolExecution[];
  recentEvents: OfficeEvent[];
  situation: OfficeSituation;
}

export function useOfficeData(workspaceId: string | null, pollInterval = 5000) {
  const [state, setState] = useState<OfficeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/office/state?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch office state');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchState();
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [workspaceId, pollInterval, fetchState]);

  return { state, loading, error, refetch: fetchState };
}
